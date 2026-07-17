/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BaseClient, type RefreshTokenResponse, type AbortableResponse } from '@/requests/client/BaseClient';

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export interface IRestClient {
    get(url: string): Promise<AxiosResponse>;
    delete(url: string): Promise<AxiosResponse>;
    post(url: string, data?: any): Promise<AxiosResponse>;
    put(url: string, data?: any): Promise<AxiosResponse>;
    patch(url: string, data?: any): Promise<AxiosResponse>;
}

export interface RestClientConfig {
    headers?: Record<string, string>;
    timeout?: number;
}

export class RestClient
    extends BaseClient<AxiosInstance, RestClientConfig, (url: string, data: any) => Promise<AxiosResponse>>
    implements IRestClient
{
    protected client!: AxiosInstance;

    private config: RestClientConfig = {};

    public readonly fetcher = async (
        url: string,
        {
            data,
            httpMethod = HttpMethod.GET,
            config,
            checkResponseIsJson = true,
        }: {
            data?: any;
            httpMethod?: HttpMethod;
            config?: AxiosRequestConfig;
            checkResponseIsJson?: boolean;
        } = {},
    ): Promise<AxiosResponse> =>
        this.enqueueRequest(async () => {
            const updatedUrl = url.startsWith('http') ? url : `${this.getBaseUrl()}${url}`;
            const tm = BaseClient['tokenManager'];
            const isAuthRequired = tm?.isAuthRequired() ?? false;
            const accessToken = tm?.getAccessToken() ?? null;

            await this.awaitRateLimit(updatedUrl);

            const headers: Record<string, string> = {
                ...(isAuthRequired && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...(this.config.headers as any),
                ...((config?.headers as any) ?? {}),
            };

            let result: AxiosResponse;

            switch (httpMethod) {
                case HttpMethod.GET:
                    result = await this.client(updatedUrl, {
                        ...config,
                        method: 'GET',
                        headers,
                    });
                    break;
                case HttpMethod.POST:
                case HttpMethod.PATCH:
                case HttpMethod.DELETE:
                    result = await this.client(updatedUrl, {
                        ...config,
                        method: httpMethod,
                        headers,
                        data: data ? JSON.stringify(data) : undefined,
                    });
                    break;
                default:
                    throw new Error(`Unexpected HttpMethod "${httpMethod}"`);
            }

            if (result.status === 401) {
                await BaseClient.refreshAccessToken(this.handleRefreshToken);
                return this.fetcher(url, { data, httpMethod, config, checkResponseIsJson });
            }

            if (result.status === 429) {
                this.addRateLimit(updatedUrl, result.headers['retry-after'] as string | null | undefined);
                return this.fetcher(url, { data, httpMethod, config, checkResponseIsJson });
            }

            if (result.status !== 200) {
                throw new Error(`status ${result.status}: ${result.statusText}`);
            }

            if (checkResponseIsJson && result.headers['content-type'] !== 'application/json') {
                throw new Error('Response is not json');
            }

            return result;
        });

    constructor(handleRefreshToken: (refreshToken: string) => AbortableResponse<RefreshTokenResponse>) {
        super(handleRefreshToken);

        this.createClient();
    }

    private createClient(): void {
        this.client = axios.create({
            timeout: 30000,
        });
    }

    public updateConfig(config: RestClientConfig): void {
        this.config = { ...this.config, ...config };
    }

    public getClient(): AxiosInstance {
        return this.client;
    }

    get get() {
        return (url: string) => this.fetcher(url);
    }

    get post() {
        return (url: string, data?: any) => this.fetcher(url, { data, httpMethod: HttpMethod.POST });
    }

    get put() {
        return (url: string, data?: any) => this.fetcher(url, { data, httpMethod: HttpMethod.POST });
    }

    get patch() {
        return (url: string, data?: any) => this.fetcher(url, { data, httpMethod: HttpMethod.PATCH });
    }

    get delete() {
        return (url: string) => this.fetcher(url, { httpMethod: HttpMethod.DELETE });
    }
}
