import { composePlugins, createField, errorsPlugin } from 'roqueform';
import { serverErrorsPlugin } from '../main';

describe('serverErrorsPlugin', () => {
  test('requires an errorsPlugin', () => {
    const field = createField({ aaa: 111 }, serverErrorsPlugin());

    expect(() => field.setServerErrors(null)).not.toThrow();
    expect(() => field.setServerErrors(undefined)).not.toThrow();
    expect(() => field.setServerErrors([])).not.toThrow();
    expect(() => field.setServerErrors([{ code: 'xxx' }])).toThrow();
  });

  test('adds an error through an errorPlugin', () => {
    const field = createField({ aaa: 111 }, composePlugins(errorsPlugin(), serverErrorsPlugin()));

    const subscriberMock = jest.fn();
    const error = { code: 'xxx' };

    field.on('*', subscriberMock);

    field.setServerErrors([error]);

    expect(field.errors.length).toBe(1);
    expect(field.errors[0]).toBe(error);
    expect(subscriberMock).toHaveBeenCalledTimes(1);
  });

  test('adds an error through an associator', () => {
    const associatorMock = jest.fn(() => 222);
    const field = createField({ aaa: 111 }, serverErrorsPlugin(undefined, associatorMock));

    field.setServerErrors([{ code: 'xxx' }]);

    expect(associatorMock).toHaveBeenCalledTimes(1);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field, { code: 'xxx' });
  });

  test('uses converter for unassociated errors', () => {
    const converterMock = jest.fn(() => 222);
    const field = createField({ aaa: 111 }, composePlugins(errorsPlugin(), serverErrorsPlugin(converterMock)));

    field.setServerErrors([{ code: 'xxx' }]);

    expect(field.errors.length).toBe(1);
    expect(field.errors[0]).toBe(222);
    expect(converterMock).toHaveBeenCalledTimes(1);
  });

  test('associates an error with the child field', () => {
    const associatorMock = jest.fn(() => 222);
    const field = createField({ aaa: 111 }, serverErrorsPlugin(undefined, associatorMock));

    field.at('aaa').serverErrorAdopters = [error => error];

    field.setServerErrors([{ code: 'xxx' }], { recursive: true });

    expect(associatorMock).toHaveBeenCalledTimes(1);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });

  test('does not associate the error twice with the same field', () => {
    const associatorMock = jest.fn();
    const field = createField({ aaa: 111 }, serverErrorsPlugin(undefined, associatorMock));

    field.at('aaa').serverErrorAdopters = [error => error, error => error];

    field.setServerErrors([{ code: 'xxx' }], { recursive: true });

    expect(associatorMock).toHaveBeenCalledTimes(1);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });

  test('associates the same error with different fields', () => {
    const associatorMock = jest.fn();
    const field = createField({ aaa: 111, bbb: 222 }, serverErrorsPlugin(undefined, associatorMock));

    field.at('aaa').serverErrorAdopters = [error => error];
    field.at('bbb').serverErrorAdopters = [error => error];

    field.setServerErrors([{ code: 'xxx' }], { recursive: true });

    expect(associatorMock).toHaveBeenCalledTimes(2);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
    expect(associatorMock).toHaveBeenNthCalledWith(2, field.at('bbb'), { code: 'xxx' });
  });

  test('associates unadopted errors with start field', () => {
    const associatorMock = jest.fn();
    const field = createField({ aaa: 111 }, serverErrorsPlugin(undefined, associatorMock));

    field.at('aaa').serverErrorAdopters = [error => (error.code === 'xxx' ? error : undefined)];

    field.setServerErrors([{ code: 'xxx' }, { code: 'yyy' }], { recursive: true });

    expect(associatorMock).toHaveBeenCalledTimes(2);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
    expect(associatorMock).toHaveBeenNthCalledWith(2, field, { code: 'yyy' });
  });

  test('ignores unadopted fields', () => {
    const associatorMock = jest.fn();
    const field = createField({ aaa: 111 }, serverErrorsPlugin(undefined, associatorMock));

    field.at('aaa').serverErrorAdopters = [error => (error.code === 'xxx' ? error : undefined)];

    field.setServerErrors([{ code: 'xxx' }, { code: 'yyy' }], { recursive: true, ignoreUnadopted: true });

    expect(associatorMock).toHaveBeenCalledTimes(1);
    expect(associatorMock).toHaveBeenNthCalledWith(1, field.at('aaa'), { code: 'xxx' });
  });
});
