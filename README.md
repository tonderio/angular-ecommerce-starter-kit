# Tonder Angular Storefront

This is an example e-commerce application which is designed to be used with the [Vendure ecommerce framework](https://github.com/vendure-ecommerce/vendure) as a back end.

It is a progressive web application (PWA) which also uses Angular Universal for server-side rendering.

The app is built with the [Angular CLI](https://github.com/angular/angular-cli), with the data layer being handled by [Apollo Client](https://github.com/apollographql/apollo-client).

## Clone
Clone this repo https://github.com/tonderio/angular-ecommerce-starter-kit.git

## Development Backend
### With default backend
0. Navigate to angular-ecommerce-starter-kit/my-shop directory
1. Run `npm install` or `yarn install`
2. Run `npm run dev` or `yarn dev`
3. If you have a error, try with section 'With your own backend'

### With your own backend
0. Open a terminal in the folder you want.
1. Run `npx @vendure/create my-shop` to create your store backend.
2. Run `npm run dev` or `yarn dev` to start backend at `http://localhost:3000`



## Development Frontend
0. Navigate to angular-ecommerce-starter-kit/my-shop directory
1. Run `npm install` or `yarn install` in the root directory (angular-ecommerce-starter-kit)
2. Run `npm start` or `yarn start` to build in development mode.
3. Make sure you have a local Vendure instance running a `http://localhost:3000`.
4. Open `http://localhost:4200` to see the storefront app running.

## Usage
0. Open `http://localhost:4200` to see the storefront app running.
1. Register on the page.
2. All set, you can select the products you want and proceed to checkout. On the payment page, you will see three example methods to pay with Tonder SDK.


## Deployment

To deploy this storefront in a production environment, take the following steps:

1. Open the [environment.prod.ts file](./src/environments/environment.prod.ts) and change the values to match your deployed Vendure server. You also probably want to set the `baseHref` value to `'/'` rather than `'/storefront/'`.
2. Open the [angular.json file](./angular.json) and set the baseHref values to point to root:
    ```diff
      "production": {
    -    "baseHref": "/storefront/",
    -    "deployUrl": "/storefront/", 
    +    "baseHref": "/",
    +    "deployUrl": "/", 
    ```
3. You then need to build for production using the `build:ssr` npm script. This can be done either locally or on your production server, depending on your preferred workflow.
4. The built artifacts will be found in the `dist/` directory. The command to run the storefront as a server-rendered app is `node dist/server/main.js`. This will start a node server running on port 4000. You should configure your webserver to pass requests arriving on port 80 to `localhost:4000`.
5. In the Vender server config, configure the `EmailPlugin` to point to the correct routes used by this storefront:
   ```ts
   EmailPlugin.init({
     // ...
     globalTemplateVars: {
       fromAddress: '"Example_Server" <noreply@example.com>',
       verifyEmailAddressUrl: 'https://your-domain.com/account/verify',
       passwordResetUrl: 'https://your-domain.com/account/reset-password',
       changeEmailAddressUrl: 'https://your-domain.com/account/change-email-address',
     }
   })
   ```


## Notes
- Remember that the backend database is SQLite by default, which means it is temporary. If you want to use a PostgreSQL database, for example, you should follow the steps in the "With your own backend" section.



## License

MIT


