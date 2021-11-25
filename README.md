# Firebase Firestore Helper

When `.add` function is called, it **must** receive an `id` inside the object to save, which is the one is going to be used as document id.

We recommend to use an `string` as ID (usually `uuid/v4`)

So, for example:

After running this:

```js
const { helperCreator } = require('firebase-firestore-helper');

const db = helperCreator({ entity: 'users' });

db.add({
  id: 'asd123',
  username: 'BrodaNoel',
  age: 31,
});
```

Your Firestore DB will look like:

```json
{
  "users": {
    "asd123": {
      "id": "asd123",
      "username": "Broda Noel",
      "age": 31
    }
  }
}
```

## Full Example, and recommended use

Your folder tree should contain 3 important parts:

```
|-> db
|    |-> users
|    |-> photos
|    |-> ...
|-> actions
|    |-> users
|    |-> photos
|    |-> ...
|-> app
|    |-> users
|    |-> photos
|    |-> ...
```

- `db/users` will **expose** the object created by this library, which will handle the `users` collections in Firestore. You'll be able to override here.
- `actions/users` will **use** the object exposed by `db/users`, and where you'll write all the business logic.
- `app/*` is just the regular file where you are listeining for the `httpRequests`, which will user `actions/*` in order to handle business logic.

Ideally, you will never user `db` files from `app` files.

```js
// db/users.js
const { helperCreator } = require('firebase-firestore-helper');

const ENTITY = 'users';

// This will expouse all the functions of this library (check functions documentation)
module.exports = {
  // `useCache` is `true` BY DEFAULT!!!
  ...helperCreator({ entity: ENTITY, useCache: true }),
};
```

```js
// actions/users.js
const { actionsHelperCreator } = require('firebase-firestore-helper');
const db = require('../db/users');

const login = async (email, password) => {
  const user = await db.getBy({ where: { email }, limit: 1 });

  if (!user || user.password !== password) {
    // ...
  }
};

module.exports = {
  ...actionsHelperCreator(db),
  login,
};
```

```js
// app/users.js
const actions = require('../actions/users');

const login = async (req, res) => {
  const isPasswordCorrect = await actions.login(/* ... */);
  // Your logic here
  return req.send(/* ... */);
}

const edit = async (req, res) => {
  // Your logic here
  const user = req.body.user;
  const firstname = req.body.newData.firstname;
  const lastname = req.body.newData.lastname;

  await actions.editById(user.id, { firstname, lastname });
  return req.send(/* ... */);
}

module.exports = app => {
  app.post('/v1/user/login', login);
  app.post('/v1/user/edit', edit);
```

## Creator Functions

These are the functions exposed by `firebase-firestore-helper`.

### `helperCreator({ entity, useCache })`

This should be used in the `db` files.

- `entity` is the collection name.
- `useCache` is `true` by default. It will create a local cache. Very dangerous if you are editing `users` collection from another side, with no using this library.

Example:

```js
// db/users.js
const { helperCreator } = require('firebase-firestore-helper');

// This will expouse all the functions of this library (check functions documentation)
module.exports = {
  ...helperCreator({
    entity: 'users',
    // `useCache` is `true` BY DEFAULT!!!
    useCache: true,
  }),
};
```

### `actionsHelperCreator(db)`

This should be used in the `actions` files.

Receives only 1 parameter. The DB object created in the `db` file.

Example:

```js
// actions/users.js
const { actionsHelperCreator } = require('firebase-firestore-helper');
const db = require('../db/users');

const login = async (email, password) => {
  const user = await db.getBy({ where: { email }, limit: 1 });

  if (!user || user.password !== password) {
    // ...
  }
};

module.exports = {
  ...actionsHelperCreator(db),
  login,
};
```

## Firestore Functions (`db` object)

### `add()`

Receives an object, that **must** contain an `id`. It saves it in the DB.

```js
db.add({
  id: 'asd123',
  username: 'BrodaNoel',
});
```

### `getBy`

Just a regular query.

```js
// These will return AN ARRAY (empty, or with elements)
db.getBy({ where: { username: 'BrodaNoel' } });
db.getBy({ where: { username: 'BrodaNoel' }, limit: 2 });
db.getBy({ where: { age: 10, status: 1 } });
db.getBy({ where: [{ age: 10 }, ['status', 'in', [1, 2, 3]]] });
db.getBy({ where: [{ age: 10 }, ['status', '>=', 2]] });

// This will return `null` or and `object` (because of limit === 1)
db.getBy({ where: { username: 'BrodaNoel' }, limit: 1 });

// Add orders
db.getBy({ where: { age: 10 }, orderBy: 'createdAt' });
db.getBy({ where: { age: 10 }, orderBy: ['createdAt', 'desc'] });
db.getBy({
  where: { age: 10 },
  orderBy: [
    ['createdAt', 'desc'],
    ['age', 'asc'],
  ],
});
```

### `getById`

Easy one.

```js
// Returns null or the object
db.getById('ads123');
```

### `getAll`

Easy one.

```js
// Always an array, empty or with items
db.getAll();
```

### `deleteById`

Easy one. Deletes a document. Say goodbye. Not able to get back.

We maaaay add `removeById` in the future, which will add a status to "hide" the document, instead of removing it. """@TODO"""

```js
db.deleteById('ads123');
```

### `editById`

Receives and `id` and the `newData` object. It works as a merge. (firebase `update()`)

```js
db.editById('ads123', { age: 32 });
```

### `clearCache`

Just clean the cache, in case of necessary.

```js
db.clearCache();
```
