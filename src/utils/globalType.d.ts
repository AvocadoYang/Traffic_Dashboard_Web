import { Observable } from 'rxjs';

export type ErrorResponse = { response?: { data?: { message?: string } } };

export type InferObservableType<T> = T extends Observable<infer X> ? X : never;
