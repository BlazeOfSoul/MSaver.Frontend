# MSaver

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.1.

## Development server

Start the backend first from the `MSaver` repository:

```bash
dotnet run --launch-profile http
```

Then start the local frontend development server:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. API calls go through `proxy.conf.json` to `http://127.0.0.1:5200`, so no frontend Docker or local nginx is needed for development.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
