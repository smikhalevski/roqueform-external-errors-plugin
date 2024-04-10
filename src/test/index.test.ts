import { composePlugins, createField, errorsPlugin } from 'roqueform';
import { externalErrorsPlugin } from '../main';

describe('externalErrorsPlugin', () => {
  test('requires an errorsPlugin', () => {
    const field = createField({ aaa: 111 }, externalErrorsPlugin());

    expect(() => field.adoptExternalErrors(null, { fallbackAdopter: error => error })).not.toThrow();
    expect(() => field.adoptExternalErrors(undefined, { fallbackAdopter: error => error })).not.toThrow();
    expect(() => field.adoptExternalErrors([], { fallbackAdopter: error => error })).not.toThrow();
    expect(() => field.adoptExternalErrors([{ code: 'xxx' }], { fallbackAdopter: error => error })).toThrow();
  });

  test('does not throw when no errors are adopted', () => {
    const field = createField({ aaa: 111 }, externalErrorsPlugin());

    expect(() => field.adoptExternalErrors(null)).not.toThrow();
    expect(() => field.adoptExternalErrors(undefined)).not.toThrow();
    expect(() => field.adoptExternalErrors([])).not.toThrow();
    expect(() => field.adoptExternalErrors([{ code: 'xxx' }])).not.toThrow();
  });

  test('adds an error through an errorPlugin', () => {
    const field = createField({ aaa: 111 }, composePlugins(errorsPlugin(), externalErrorsPlugin()));

    const subscriberMock = jest.fn();
    const error = { code: 'xxx' };

    field.on('*', subscriberMock);

    expect(field.adoptExternalErrors([error], { fallbackAdopter: error => error })[0]).toBe(error);
    expect(field.errors.length).toBe(1);
    expect(field.errors[0]).toBe(error);
    expect(subscriberMock).toHaveBeenCalledTimes(1);
  });

  test('adds an error through an associator', () => {
    const errorAssociatorMock = jest.fn(() => 222);
    const field = createField({ aaa: 111 }, externalErrorsPlugin(errorAssociatorMock));

    field.adoptExternalErrors([{ code: 'xxx' }], { fallbackAdopter: error => error });

    expect(errorAssociatorMock).toHaveBeenCalledTimes(1);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field, { code: 'xxx' });
  });

  test('uses converter for unassociated errors', () => {
    const fallbackAdopterMock = jest.fn(() => 222);

    const field = createField({ aaa: 111 }, composePlugins(errorsPlugin(), externalErrorsPlugin()));

    field.adoptExternalErrors([{ code: 'xxx' }], { fallbackAdopter: fallbackAdopterMock });

    expect(field.errors.length).toBe(1);
    expect(field.errors[0]).toBe(222);
    expect(fallbackAdopterMock).toHaveBeenCalledTimes(1);
  });

  test('associates an error with the child field', () => {
    const errorAssociatorMock = jest.fn(() => 222);
    const field = createField({ aaa: 111 }, externalErrorsPlugin(errorAssociatorMock));

    field.at('aaa').externalErrorAdopters = [error => error];

    field.adoptExternalErrors([{ code: 'xxx' }], { recursive: true });

    expect(errorAssociatorMock).toHaveBeenCalledTimes(1);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });

  test('does not associate the error twice with the same field', () => {
    const errorAssociatorMock = jest.fn();
    const field = createField({ aaa: 111 }, externalErrorsPlugin(errorAssociatorMock));

    field.at('aaa').externalErrorAdopters = [error => error, error => error];

    field.adoptExternalErrors([{ code: 'xxx' }], { recursive: true });

    expect(errorAssociatorMock).toHaveBeenCalledTimes(1);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });

  test('associates the same error with different fields', () => {
    const errorAssociatorMock = jest.fn();
    const field = createField({ aaa: 111, bbb: 222 }, externalErrorsPlugin(errorAssociatorMock));

    field.at('aaa').externalErrorAdopters = [error => error];
    field.at('bbb').externalErrorAdopters = [error => error];

    field.adoptExternalErrors([{ code: 'xxx' }], { recursive: true });

    expect(errorAssociatorMock).toHaveBeenCalledTimes(2);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(2, field.at('bbb'), { code: 'xxx' });
  });

  test('associates unadopted errors with start field', () => {
    const errorAssociatorMock = jest.fn();
    const field = createField({ aaa: 111 }, externalErrorsPlugin(errorAssociatorMock));

    field.at('aaa').externalErrorAdopters = [error => (error.code === 'xxx' ? error : undefined)];

    field.adoptExternalErrors([{ code: 'xxx' }, { code: 'yyy' }], { recursive: true, fallbackAdopter: error => error });

    expect(errorAssociatorMock).toHaveBeenCalledTimes(2);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(2, field, { code: 'yyy' });
  });

  test('ignores unadopted fields', () => {
    const errorAssociatorMock = jest.fn();
    const field = createField({ aaa: 111 }, externalErrorsPlugin(errorAssociatorMock));
    const errors = [{ code: 'xxx' }, { code: 'yyy' }];

    field.at('aaa').externalErrorAdopters = [error => (error.code === 'xxx' ? error : undefined)];

    expect(field.adoptExternalErrors(errors, { recursive: true })).toEqual([{ code: 'xxx' }]);
    expect(errorAssociatorMock).toHaveBeenCalledTimes(1);
    expect(errorAssociatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });

  test('returns an empty array if no errors are no associated errors', () => {
    const field = createField({ aaa: 111 }, composePlugins(errorsPlugin(), externalErrorsPlugin()));

    expect(field.adoptExternalErrors([{ code: 'xxx' }]).length).toBe(0);
  });
});
