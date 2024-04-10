# roqueform-server-errors-plugin

Associates server errors with [Roqueform](https://github.com/smikhalevski/roqueform#readme) fields.

```shell
npm install --save-prod roqueform roqueform-server-errors-plugin
```

🔎 [Check out the API Docs](https://smikhalevski.github.io/roqueform-server-errors-plugin)

# Overview

Import and enable the plugin:

```ts
import { composePlugins, createField, errorsPlugin } from 'roqueform';
import { serverErrorsPlugin } from 'roqueform-server-errors-plugin';

const field = createField(
  { planet: 'Alderaan' },
  composePlugins(
    errorsPlugin(),
    serverErrorsPlugin()
  )
);
```

Declare how fields would adopt server errors:

```ts
field.at('planet').serverErrorAdopters = [
  error => {
    if (error.code === 'fictionalPlanet') {
      return { message: 'Must be a real planet' };
    }
  }
];
```

Set server errors to fields:

```ts
const serverErrors = [{ code: 'fictionalPlanet' }];

field.setServerErrors(serverErrors, { recursive: true });

field.at('planet').errors
// ⮕ [{ message: 'Must be a real planet' }]

field.at('planet').isInvalid
// ⮕ true
```
