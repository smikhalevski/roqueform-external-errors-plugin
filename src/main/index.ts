import type { ErrorsPlugin, Field, PluginInjector } from 'roqueform';

/**
 * Options of the {@link ServerErrorsPlugin.setServerErrors} method.
 */
export interface SetServerErrorsOptions {
  /**
   * If `true` then errors are checked against {@link ServerErrorsPlugin.serverErrorAdopters} and added to both this
   * field and of its descendant fields.
   *
   * @default false
   */
  recursive?: boolean;

  /**
   * If `true` then only server errors that were adopted by {@link ServerErrorsPlugin.serverErrorAdopters} are
   * associated with the field. Otherwise, errors for which all adopters returned `undefined` are added to the field
   * where {@link ServerErrorsPlugin.setServerErrors} was called.
   *
   * @default false
   */
  ignoreUnadopted?: boolean;
}

/**
 * The plugin that associates errors with fields using adopters.
 *
 * @template ServerError The error received from the server.
 * @template ClientError The error associated with the field.
 */
export interface ServerErrorsPlugin<ServerError, ClientError> {
  /**
   * An array of callbacks that receive a server error and return an error that must be associated with the field, or
   * `undefined` if the server error isn't associated with the field.
   */
  serverErrorAdopters: Array<(serverError: ServerError) => ClientError | undefined | void>;

  /**
   * Sets server errors to the field and its descendants.
   *
   * @param serverErrors The server errors to set.
   * @param options Additional options.
   */
  setServerErrors(serverErrors: ServerError[] | null | undefined, options?: SetServerErrorsOptions): void;
}

/**
 * Enhances fields with methods that manage server errors.
 *
 * @param errorConverter Converts a server error to a client error that would be associated with the field. By default,
 * errors aren't converted.
 * @param errorAssociator Associates an error with the field. By default, expects that field is enhanced by the
 * {@link roqueform!errorsPlugin errorsPlugin}.
 * @returns `true` if any of given errors were associated with fields, or `false` otherwise.
 * @template ServerError The error received from the server.
 * @template ClientError The error associated with the field.
 */
export function serverErrorsPlugin<ServerError = any, ClientError = ServerError>(
  errorConverter: (error: ServerError) => ClientError = identityConverter,
  errorAssociator: (field: Field, error: ClientError) => void = errorsPluginAssociator
): PluginInjector<ServerErrorsPlugin<ServerError, ClientError>> {
  return field => {
    field.serverErrorAdopters = [];

    field.setServerErrors = (serverErrors, options) => {
      if (serverErrors === null || serverErrors === undefined || serverErrors.length === 0) {
        return false;
      }

      const adoptedServerErrors = adoptServerErrors(
        field,
        serverErrors,
        errorAssociator,
        options !== undefined && options.recursive,
        []
      );

      if (serverErrors.length === adoptedServerErrors.length || (options !== undefined && options.ignoreUnadopted)) {
        return adoptedServerErrors.length !== 0;
      }

      for (const serverError of serverErrors) {
        if (!adoptedServerErrors.includes(serverError)) {
          errorAssociator(field, errorConverter(serverError));
        }
      }
      return true;
    };
  };
}

/**
 * Returns the array of errors that were adopted by fields.
 */
function adoptServerErrors<ServerError, ClientError>(
  field: Field<unknown, ServerErrorsPlugin<ServerError, ClientError>>,
  serverErrors: ServerError[],
  errorAssociator: (field: Field, error: ClientError) => void,
  recursive: boolean | undefined,
  adoptedServerErrors: ServerError[]
): ServerError[] {
  if (field.serverErrorAdopters.length !== 0) {
    serverErrors: for (const serverError of serverErrors) {
      for (const adopter of field.serverErrorAdopters) {
        const error = adopter(serverError);

        if (error === undefined) {
          continue;
        }

        errorAssociator(field, error);
        adoptedServerErrors.push(serverError);
        continue serverErrors;
      }
    }
  }

  if (field.children !== null && recursive) {
    for (const child of field.children) {
      adoptServerErrors(child, serverErrors, errorAssociator, true, adoptedServerErrors);
    }
  }

  return adoptedServerErrors;
}

function identityConverter(error: any): any {
  return error;
}

function errorsPluginAssociator(field: Field, error: unknown): void {
  const { addError } = field as Field<unknown, ErrorsPlugin>;

  if (typeof addError !== 'function') {
    throw new Error('Expected errorsPlugin() to be injected into the field');
  }

  addError(error);
}
