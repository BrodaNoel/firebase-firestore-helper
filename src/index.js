import { firestore } from 'firebase-admin';

// DB HELPER

/**
 * {
 *   users: {
 *     123: { id: 123, name: 'Noel' }
 *   }
 * }
 */
const cache = {};

const add =
  ({ entity, useCache }) =>
  async data => {
    if (typeof data.id === 'undefined') {
      throw new Error("'id' is required");
    }

    const response = await firestore()
      .collection(entity)
      .doc(data.id)
      .set(data);

    if (useCache) {
      cache[entity][data.id] = data;
    }

    return response;
  };

const getById =
  ({ entity, useCache }) =>
  async id => {
    if (useCache && cache[entity].hasOwnProperty(id)) {
      return cache[entity][id];
    }

    const doc = await firestore().collection(entity).doc(id).get();
    const data = doc.exists ? doc.data() : undefined;

    if (useCache) {
      cache[entity][id] = data;
    }

    return data;
  };

/**
 * @example
 * db.getBy({
 *   where: [
 *     { age: 30, isEnabled: true },
 *     { status, 'in', [1, 2, 3] }
 *   ]
 * })
 *
 * or
 *
 * db.getBy({
 *   where: {
 *     age: 30,
 *     isEnabled: true
 *   }
 * })
 */
const getBy =
  ({ entity, useCache }) =>
  async params => {
    let query = firestore().collection(entity);

    if (params.where) {
      if (Array.isArray(params.where)) {
        params.where.forEach(condition => {
          if (Array.isArray(condition)) {
            // ['user', 'in', [1,2,3]]
            query = query.where(...condition);
          } else {
            // { user: 3, isVisible: true }
            Object.keys(condition).forEach(key => {
              query = query.where(key, '=', condition[key]);
            });
          }
        });
      } else {
        // { user: 3, isVisible: true }
        Object.keys(params.where).forEach(key => {
          query = query.where(key, '=', params.where[key]);
        });
      }
    }

    // { orderBy: [['user', 'desc'], ['createdAt', 'asc']] }
    if (params.orderBy) {
      if (!Array.isArray(params.orderBy)) {
        throw new Error(
          "params.orderBy should be an array like:[['user', 'desc'], ['createdAt', 'asc']]"
        );
      }

      params.orderBy.forEach(x => {
        query = query.orderBy(...x);
      });
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const snapshot = await query.get();

    const data = [];

    if (useCache) {
      snapshot.forEach(doc => {
        cache[entity][doc.id] = doc.data();
        data.push(cache[entity][doc.id]);
      });
    } else {
      snapshot.forEach(doc => {
        data.push(doc.data());
      });
    }

    return data;
  };

/**
 * This method does NOT retrieve cache data, but it saves data in cache
 */
const getAll =
  ({ entity, useCache }) =>
  async () => {
    const snapshot = await firestore().collection(entity).get();

    if (useCache) {
      snapshot.forEach(doc => {
        cache[entity][doc.id] = doc.data();
      });

      return cache[entity];
    } else {
      const data = [];
      snapshot.forEach(doc => {
        data.push(doc.data());
      });

      return data;
    }
  };

const deleteById =
  ({ entity, useCache }) =>
  async id => {
    const response = await firestore().collection(entity).doc(id).delete();

    if (useCache) {
      cache[entity][id] = undefined;
    }

    return response;
  };

const editById =
  ({ entity, useCache }) =>
  async (id, newData) => {
    const response = await firestore()
      .collection(entity)
      .doc(id)
      .update(newData);

    // TODO: Maybe updating the object in the cache?
    // if (useCache) {
    //   cache[entity][id] = { ...cache[entity][id], ...newData };
    // }
    // For now... Let's just clean the cache
    if (useCache) {
      delete cache[entity][id];
    }

    return response;
  };

const clearCache =
  ({ entity }) =>
  key => {
    if (key) {
      delete cache[entity][key];
    } else {
      cache[entity] = {};
    }
  };

export const helperCreator = ({ entity, useCache = true }) => {
  if (useCache && !cache[entity]) {
    cache[entity] = {};
  }

  return {
    add: add({ entity, useCache }),
    getBy: getBy({ entity, useCache }),
    getById: getById({ entity, useCache }),
    getAll: getAll({ entity, useCache }),
    deleteById: deleteById({ entity, useCache }),
    editById: editById({ entity, useCache }),
    clearCache: clearCache({ entity }),
  };
};

// ACTIONS HELPER

const actionAdd = db => data => {
  return db.add(data);
};

const actionGetBy = db => params => {
  return db.getBy(params);
};

const actionGetById = db => id => {
  return db.getById(id);
};

const actionGetAll = db => () => {
  return db.getAll();
};

const actionDeleteById = db => id => {
  return db.deleteById(id);
};

const actionEditById = db => (id, newData) => {
  return db.editById(id, newData);
};

const actionClearCache = db => key => {
  return db.clearCache(key);
};

export const actionsHelperCreator = db => {
  return {
    add: actionAdd(db),
    getBy: actionGetBy(db),
    getById: actionGetById(db),
    getAll: actionGetAll(db),
    deleteById: actionDeleteById(db),
    editById: actionEditById(db),
    clearCache: actionClearCache(db),
  };
};
