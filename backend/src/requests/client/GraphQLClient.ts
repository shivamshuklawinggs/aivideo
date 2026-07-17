/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ErrorLink } from '@apollo/client/link/error';
import { SetContextLink } from '@apollo/client/link/context';
import type { ErrorLike } from '@apollo/client';
import { ApolloClient, ApolloLink, CombinedGraphQLErrors, InMemoryCache, ServerError } from '@apollo/client';
import { HttpLink } from '@apollo/client/link/http';
import { filter, firstValueFrom, from, map, switchMap } from 'rxjs';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import type { Client as WSClient, Message as WSMessage } from 'graphql-ws';
import { createClient as createWsClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { RemoveTypenameFromVariablesLink } from '@apollo/client/link/remove-typename';
import type { GraphQLFormattedError } from 'graphql';
import { BaseClient, type RefreshTokenResponse, type AbortableResponse } from '@/requests/client/BaseClient';

export class GraphQLClient extends BaseClient<ApolloClient, ApolloClient.Options, null> {
    readonly fetcher = null;

    public client!: ApolloClient;

    private wsClient!: WSClient;

    private wsClientAliveCheckInterval: NodeJS.Timeout | undefined = undefined;

    private activeConnectionSubscriptions = new Map<string, () => void>();

    constructor(handleRefreshToken: (refreshToken: string) => AbortableResponse<RefreshTokenResponse>) {
        super(handleRefreshToken);

        this.createClient();
    }

    public override getBaseUrl(): string {
        return `${super.getBaseUrl()}/api/graphql`;
    }

    override reset(): void {
        super.reset();

        this.client.clearStore();
        this.client.stop();

        this.resetWsClient(false);
        this.createClient();
    }

    private resetWsClient(recreateClient: boolean): void {
        this.wsClient.dispose();
        this.wsClient.terminate();

        if (!recreateClient) {
            return;
        }

        this.createWSClient(false);
        this.client.setLink(this.createLink());

        this.restartAllSubscriptions();
    }

    private restartAllSubscriptions(): void {
        this.activeConnectionSubscriptions.forEach((callback) => callback());
    }

    protected override shouldQueueRequest(operationName: string | undefined): boolean {
        const authOperations = ['GET_ABOUT', 'USER_LOGIN', 'USER_REFRESH'];
        if (authOperations.includes(operationName!)) {
            return false;
        }

        return super.shouldQueueRequest(operationName);
    }

    private createAuthGuardLink() {
        return new ApolloLink((operation, forward) => {
            const { operationName } = operation;

            if (this.shouldQueueRequest(operationName)) {
                return from(this.enqueueRequest(() => firstValueFrom(forward(operation)), operationName));
            }

            return forward(operation);
        });
    }

    protected override getOriginFromUrl(operation: string): string {
        return operation;
    }

    private getRateLimitOrigin(operation: ApolloLink.Operation): string {
        return `${operation.operationName}::${JSON.stringify(operation.variables)}`;
    }

    private isRateLimitError(error: ErrorLike): boolean {
        if (CombinedGraphQLErrors.is(error)) {
            return error.errors.some(
                (gqlError) =>
                    gqlError.message.toLowerCase().includes('http 429') ||
                    gqlError.message.toLowerCase().includes('http error 429') ||
                    gqlError.message.toLowerCase().includes('too many requests'),
            );
        }

        if (ServerError.is(error)) {
            return error.statusCode === 429;
        }

        return false;
    }

    private isAuthError(errors: readonly GraphQLFormattedError[]): boolean {
        return errors.some((graphQLError) =>
            graphQLError.message.includes('suwayomi.tachidesk.server.user.UnauthorizedException'),
        );
    }

    private createErrorLink() {
        return new ErrorLink(({ error, operation, forward }) => {
            if (this.isRateLimitError(error)) {
                this.addRateLimit(
                    this.getRateLimitOrigin(operation),
                    operation.getContext()?.headers?.get?.('Retry-After'),
                );

                return from(this.awaitRateLimit(this.getRateLimitOrigin(operation))).pipe(
                    switchMap(() => forward(operation)),
                );
            }

            if (!CombinedGraphQLErrors.is(error)) {
                return undefined;
            }

            if (!this.isAuthError(error.errors)) {
                return undefined;
            }

            return from(BaseClient.refreshAccessToken(this.handleRefreshToken)).pipe(
                filter(Boolean),
                map((result) => {
                    this.restartAllSubscriptions();
                    return result;
                }),
                switchMap(() => forward(operation)),
            );
        });
    }

    private createAuthLink() {
        return new SetContextLink(({ headers }) => {
            const tm = BaseClient['tokenManager'];
            const isAuthRequired = tm?.isAuthRequired() ?? false;
            const accessToken = tm?.getAccessToken() ?? null;

            return {
                headers: {
                    ...headers,
                    ...(isAuthRequired && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
            };
        });
    }

    private createHttpLink() {
        return new HttpLink({ uri: () => this.getBaseUrl(), fetch });
    }

    private createWSLink() {
        return new GraphQLWsLink(this.wsClient);
    }

    private createLink() {
        const removeTypenameLink = new RemoveTypenameFromVariablesLink();

        return ApolloLink.split(
            ({ query }) => {
                const definition = getMainDefinition(query);
                return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
            },
            this.createWSLink(),
            ApolloLink.from([
                this.createAuthGuardLink(),
                this.createErrorLink(),
                this.createAuthLink(),
                removeTypenameLink,
                this.createHttpLink(),
            ]),
        );
    }

    private createWSClient(lazy: boolean = true): void {
        const heartbeatInterval = 20_000;

        this.wsClient = createWsClient({
            lazy,
            url: () => this.getBaseUrl().replace(/^http/, 'ws'),
            keepAlive: heartbeatInterval,
            retryAttempts: Number.MAX_SAFE_INTEGER,
            shouldRetry: () => true,
            retryWait: async (retries: number) => {
                const delay = Math.min(1000 * 2 ** retries, heartbeatInterval);

                return new Promise<void>((resolve) => {
                    setTimeout(resolve, delay);
                });
            },
            connectionParams: () => {
                const tm = BaseClient['tokenManager'];
                const isAuthRequired = tm?.isAuthRequired() ?? false;
                const accessToken = tm?.getAccessToken() ?? null;

                return {
                    Authorization: isAuthRequired && accessToken ? accessToken : undefined,
                };
            },
        });

        let triedForcedReconnection = false;
        let lastHeartbeat: number = Date.now();
        this.wsClient.on('message', async (e: WSMessage) => {
            lastHeartbeat = Date.now();
            triedForcedReconnection = false;

            if (e.type !== 'error') {
                return;
            }

            const tm = BaseClient['tokenManager'];
            const errorPayload = e.payload as readonly GraphQLFormattedError[] | undefined;
            if (tm && !tm.isAuthRequired() && errorPayload && this.isAuthError(errorPayload)) {
                try {
                    await BaseClient.refreshAccessToken(this.handleRefreshToken);
                    this.resetWsClient(true);
                } catch (_) {
                    // Ignore
                }
            }
        });

        const checkHeartbeatInterval = heartbeatInterval + 30_000;
        clearInterval(this.wsClientAliveCheckInterval);
        this.wsClientAliveCheckInterval = setInterval(() => {
            const isHeartbeatMissing = Date.now() - lastHeartbeat > checkHeartbeatInterval * 1.1;
            if (!isHeartbeatMissing) {
                return;
            }

            if (!triedForcedReconnection) {
                triedForcedReconnection = true;
                this.wsClient.terminate();

                return;
            }

            clearInterval(this.wsClientAliveCheckInterval);
            this.resetWsClient(true);
        }, checkHeartbeatInterval);
    }

    protected createClient(createWsClientLazily?: boolean) {
        this.createWSClient(createWsClientLazily);
        this.client = new ApolloClient({
            cache: new InMemoryCache(),
            link: this.createLink(),
        });
    }

    public override updateConfig() {}

    public registerSubscription(id: string, restart: () => void): void {
        this.activeConnectionSubscriptions.set(id, restart);
    }

    public unregisterSubscription(id: string): void {
        this.activeConnectionSubscriptions.delete(id);
    }
}
