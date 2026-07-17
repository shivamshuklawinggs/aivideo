/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

interface QueuedRequest {
    execute: () => void;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

interface RateLimitInfo {
    timestamp: number;
    retryAfter: number;
}

export interface TokenManager {
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    setAccessToken(token: string): void;
    isAuthRequired(): boolean;
    isAuthInitialized(): boolean;
    setAuthInitialized(value: boolean): void;
    setAuthRequired(value: boolean | null): void;
    setIsRefreshingToken(value: boolean): void;
    shouldQueueRequests(): boolean;
    removeTokens(): void;
}

export interface RefreshTokenResponse {
    refreshToken: { accessToken: string };
}

export interface AbortableResponse<T> {
    response: Promise<{ data?: T }>;
}

export class ControlledPromise<T> {
    promise: Promise<T>;
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

export abstract class BaseClient<Client, ClientConfig, Fetcher> {
    protected abstract client: Client;

    public abstract readonly fetcher: Fetcher;

    private static activeTokenRefreshPromise: Promise<RefreshTokenResponse | null | undefined> | null = null;

    private static onTokenRefreshComplete: (() => void) | null = null;

    protected requestQueue: QueuedRequest[] = [];

    private static rateLimitState = new Map<string, RateLimitInfo>();

    protected static tokenManager: TokenManager | null = null;

    protected static baseUrl: string = process.env.SUKUYAMI_SERVER_URL || 'http://localhost:4567';

    protected constructor(
        protected handleRefreshToken: (refreshToken: string) => AbortableResponse<RefreshTokenResponse>,
    ) {}

    public static setTokenManager(manager: TokenManager): void {
        BaseClient.tokenManager = manager;
    }

    public static setBaseUrl(url: string): void {
        BaseClient.baseUrl = url;
    }

    public reset(): void {
        BaseClient.activeTokenRefreshPromise = null;
        this.clearQueue(new Error('Client reset'));
    }

    public static setTokenRefreshCompleteCallback(callback: (() => void) | null): void {
        BaseClient.onTokenRefreshComplete = callback;
    }

    protected static async refreshAccessToken(
        refreshFn: (refreshToken: string) => AbortableResponse<RefreshTokenResponse>,
    ): Promise<RefreshTokenResponse | null | undefined> {
        const tm = BaseClient.tokenManager;
        if (!tm) {
            throw new Error('Token manager not set');
        }

        const refreshToken = tm.getRefreshToken();

        if (!tm.isAuthInitialized()) {
            tm.setAuthInitialized(true);
            tm.setAuthRequired(true);
        }

        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        if (this.activeTokenRefreshPromise) {
            return this.activeTokenRefreshPromise;
        }

        tm.setIsRefreshingToken(true);

        const refreshRequest = refreshFn(refreshToken).response;
        this.activeTokenRefreshPromise = refreshRequest.then((result) => result.data);

        try {
            const result = await refreshRequest;
            const { data } = result;

            if (!data) {
                throw new Error('No refreshed access token returned');
            }

            tm.setAccessToken(data.refreshToken.accessToken);

            BaseClient.onTokenRefreshComplete?.();

            return data;
        } catch (e) {
            tm.removeTokens();
            throw e;
        } finally {
            this.activeTokenRefreshPromise = null;
            tm.setIsRefreshingToken(false);
        }
    }

    public getBaseUrl(): string {
        return BaseClient.baseUrl;
    }

    protected shouldQueueRequest(_operationName?: string): boolean {
        const tm = BaseClient.tokenManager;
        if (!tm) return false;
        return tm.shouldQueueRequests();
    }

    protected enqueueRequest<T>(executor: () => Promise<T>, operationName?: string): Promise<T> {
        if (!this.shouldQueueRequest(operationName)) {
            return executor();
        }

        const queuedRequest = new ControlledPromise<T>();
        const resolve = queuedRequest.resolve.bind(queuedRequest);
        const reject = queuedRequest.reject.bind(queuedRequest);

        this.requestQueue.push({
            execute: () => {
                executor().then(resolve).catch(reject);
            },
            resolve,
            reject,
        });

        return queuedRequest.promise;
    }

    public processQueue(): void {
        const queue = [...this.requestQueue];
        this.requestQueue = [];

        queue.forEach((request) => {
            request.execute();
        });
    }

    protected clearQueue(error?: Error): void {
        const queue = [...this.requestQueue];
        this.requestQueue = [];

        queue.forEach((request) => {
            request.reject(error ?? new Error('Request queue cleared'));
        });
    }

    public abstract updateConfig(config: Partial<ClientConfig>): void;

    private convertRetryAfter(retryAfter: string | null | undefined): number {
        if (retryAfter == null) {
            return 60_000;
        }

        const seconds = parseInt(retryAfter, 10);
        if (!Number.isNaN(seconds)) {
            return seconds * 1000;
        }

        const date = new Date(retryAfter);
        return date.getTime() - Date.now();
    }

    protected getOriginFromUrl(url: string): string {
        const { origin } = new URL(url);

        if (origin.startsWith(BaseClient.baseUrl)) {
            return url;
        }

        return origin;
    }

    protected addRateLimit(url: string, retryAfter: string | null | undefined) {
        BaseClient.rateLimitState.set(this.getOriginFromUrl(url), {
            timestamp: Date.now(),
            retryAfter: this.convertRetryAfter(retryAfter),
        });
    }

    private deleteRateLimit(origin: string) {
        BaseClient.rateLimitState.delete(origin);
    }

    protected getRateLimitTimeout(url: string): number {
        return BaseClient.rateLimitState.get(this.getOriginFromUrl(url))?.retryAfter ?? 0;
    }

    protected isRateLimited(url: string): boolean {
        const origin = this.getOriginFromUrl(url);

        const rateLimitInfo = BaseClient.rateLimitState.get(origin);

        if (!rateLimitInfo) {
            return false;
        }

        const shouldRetry = Date.now() >= rateLimitInfo.timestamp + rateLimitInfo.retryAfter;
        if (!shouldRetry) {
            return true;
        }

        this.deleteRateLimit(origin);

        return false;
    }

    protected async awaitRateLimit(url: string): Promise<void> {
        if (!this.isRateLimited(url)) {
            return;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, this.getRateLimitTimeout(url));
        });
    }
}
