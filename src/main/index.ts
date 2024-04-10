import type { ErrorsPlugin, Field, PluginInjector } from 'roqueform';

/**
 * The plugin that associates external errors with fields using adopters.
 *
 * @template ExternalError The external error that can be adopted by the field.
 * @template Error The error that is associated with the field.
 */
export interface ExternalErrorsPlugin<ExternalError, Error> {
  /**
   * An array of callbacks that receive an external error and return an error that must be associated with the field,
   * or `undefined` if the external error must not be associated with the field.
   */
  externalErrorAdopters: Array<(externalError: ExternalError) => Error | undefined | void>;

  /**
   * Sets external errors to the field and its descendants.
   *
   * @param externalErrors The external errors to adopt.
   * @param options Additional options.
   * @returns An array of adopted external errors.
   */
  adoptExternalErrors(
    externalErrors: ExternalError[] | null | undefined,
    options?: AdoptExternalErrorsOptions<ExternalError, Error>
  ): ExternalError[];
}

/**
 * Options of the {@link ExternalErrorsPlugin.adoptExternalErrors} method.
 */
export interface AdoptExternalErrorsOptions<ExternalError, Error> {
  /**
   * If `true` then external errors are adopted by both this field and all of its descendant fields.
   *
   * @default false
   */
  recursive?: boolean;

  /**
   * Adopts errors that were not adopted by any field.
   *
   * @param externalError The external error to adopt.
   */
  fallbackAdopter?: (externalError: ExternalError) => Error | undefined | void;
}

/**
 * The plugin that associates external errors with fields using adopters.
 *
 * @param errorAssociator Associates an error with the field. By default,
 * {@link roqueform!ErrorsPlugin.addError ErrorsPlugin.addError} is used.
 * @template ExternalError The external error that can be adopted by the field.
 * @template Error The error that is associated with the field.
 */
export function externalErrorsPlugin<ExternalError = any, Error = ExternalError>(
  errorAssociator: (field: Field, error: Error) => void = defaultErrorAssociator
): PluginInjector<ExternalErrorsPlugin<ExternalError, Error>> {
  return field => {
    field.externalErrorAdopters = [];

    field.adoptExternalErrors = (externalErrors, options) => {
      if (externalErrors === null || externalErrors === undefined || externalErrors.length === 0) {
        return [];
      }

      const adoptedErrors = adoptErrors(
        field,
        externalErrors,
        errorAssociator,
        options !== undefined && options.recursive,
        []
      );

      const fallbackErrorAdopter = options && options.fallbackAdopter;

      if (fallbackErrorAdopter === undefined || externalErrors.length === adoptedErrors.length) {
        return adoptedErrors;
      }

      for (const externalError of externalErrors) {
        if (adoptedErrors.includes(externalError)) {
          // Already adopted
          continue;
        }

        const error = fallbackErrorAdopter(externalError);

        if (error === undefined) {
          // Cannot be adopted
          continue;
        }

        errorAssociator(field, error);
        adoptedErrors.push(externalError);
      }

      return adoptedErrors;
    };
  };
}

/**
 * Returns the array of errors that were adopted by fields.
 */
function adoptErrors<ExternalError, Error>(
  field: Field<unknown, ExternalErrorsPlugin<ExternalError, Error>>,
  externalErrors: ExternalError[],
  errorAssociator: (field: Field, error: Error) => void,
  recursive: boolean | undefined,
  adoptedErrors: ExternalError[]
): ExternalError[] {
  if (field.externalErrorAdopters.length !== 0) {
    externalErrors: for (const externalError of externalErrors) {
      for (const errorAdopter of field.externalErrorAdopters) {
        const error = errorAdopter(externalError);

        if (error === undefined) {
          // Cannot be adopted
          continue;
        }

        errorAssociator(field, error);
        adoptedErrors.push(externalError);
        continue externalErrors;
      }
    }
  }

  if (field.children !== null && recursive) {
    for (const child of field.children) {
      adoptErrors(child, externalErrors, errorAssociator, true, adoptedErrors);
    }
  }

  return adoptedErrors;
}

function defaultErrorAssociator(field: Field, error: unknown): void {
  const { addError } = field as Field<unknown, ErrorsPlugin>;

  if (typeof addError !== 'function') {
    throw new Error('Expected errorsPlugin() to be injected into the field');
  }

  addError(error);
}
