# roqueform-external-errors-plugin

The plugin that associates external errors with [Roqueform](https://github.com/smikhalevski/roqueform#readme) fields
using adopters.

```shell
npm install --save-prod roqueform roqueform-external-errors-plugin
```

🔎 [Check out the API Docs](https://smikhalevski.github.io/roqueform-external-errors-plugin)

# Overview

Import and enable the plugin:

```ts
import { composePlugins, createField, errorsPlugin } from 'roqueform';
import { externalErrorsPlugin } from 'roqueform-external-errors-plugin';

const field = createField(
  { planet: 'Alderaan' },
  composePlugins(
    errorsPlugin(),
    externalErrorsPlugin()
  )
);
```

Declare how fields would adopt external errors:

```ts
field.at('planet').externalErrorAdopters = [
  error => {
    if (error.code === 'fictionalPlanet') {
      return { message: 'Must be a real planet' };
    }
  }
];
```

Let fields adopt external errors:

```ts
const externalErrors = [{ code: 'fictionalPlanet' }];

field.adoptExternalErrors(externalErrors, { recursive: true });

field.at('planet').errors
// ⮕ [{ message: 'Must be a real planet' }]

field.at('planet').isInvalid
// ⮕ true
```
