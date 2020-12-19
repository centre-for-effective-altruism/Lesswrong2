import { MongoClient } from 'mongodb';
import { randomId } from './random';

let client: any = null;
let db: any = null;
export const setDatabaseConnection = (_client, _db) => {
  client = _client;
  db = _db;
}
export const getDatabase = () => db;

const disableAllWrites = false;

export class MongoCollection<T extends DbObject> {
  tableName: string
  
  constructor(tableName: string, options?: {
    _suppressSameNameError?: boolean // Used only by Meteor; disables warning about name conflict over users collection
  }) {
    this.tableName = tableName;
  }
  
  getTable = () => {
    if (webpackIsServer) { 
      return db.collection(this.tableName);
    } else {
      throw new Error("Attempted to run mongodb query on the client");
    }
  }
  
  find = (selector?: MongoSelector<T>, options?: MongoFindOptions<T>, projection?: MongoProjection<T>): FindResult<T> => {
    return {
      fetch: async () => {
        const table = this.getTable();
        const result = await table.find(selector, {
          ...options,
        }).toArray()
        return result;
      },
      count: async () => {
        const table = this.getTable();
        return await table.countDocuments(selector, {
          ...options,
        });
      }
    };
  }
  findOne = async (selector?: string|MongoSelector<T>, options?: MongoFindOneOptions<T>, projection?: MongoProjection<T>): Promise<T|null> => {
    const table = this.getTable();
    if (typeof selector === "string") {
      return await table.findOne({_id: selector}, {
        ...options,
      });
    } else {
      return await table.findOne(selector, {
        ...options,
      });
    }
  }
  insert = async (doc, options) => {
    if (disableAllWrites) return;
    if (!doc._id) {
      doc._id = randomId();
    }
    const table = this.getTable();
    const insertResult = await table.insertOne(doc, options);
    return insertResult.insertedId;
  }
  update = async (selector, update, options) => {
    if (disableAllWrites) return;
    const table = this.getTable();
    if (typeof selector === 'string') {
      const updateResult = await table.update({_id: selector}, update, options);
      return updateResult.matchedCount;
    } else {
      const updateResult = await table.update(selector, update, options);
      return updateResult.matchedCount;
    }
  }
  remove = async (selector, options)=>{
    if (disableAllWrites) return;
    const table = this.getTable();
    return await table.remove(selector, options);
  }
  _ensureIndex = async (fieldOrSpec, options)=>{
    if (disableAllWrites) return;
    const table = this.getTable();
    try {
      return await table.ensureIndex(fieldOrSpec, options);
    } catch(e) {
      console.error(`Error creating index ${JSON.stringify(fieldOrSpec)} on ${this.tableName}: ${e}`);
    }
  }
  
  
  //TODO
  views: any
  defaultView: any
  addView: any
  addDefaultView: any
  
  aggregate = (pipeline, options) => {
    const table = this.getTable();
    return table.aggregate(pipeline, options);
  }
  rawCollection = () => ({
    bulkWrite: async (operations, options) => {
      if (disableAllWrites) return;
      const table = this.getTable();
      return await table.bulkWrite(operations, options);
    },
    findOneAndUpdate: async (filter, update, options) => {
      if (disableAllWrites) return;
      const table = this.getTable();
      return await table.findOneAndUpdate(filter, update, options);
    },
    dropIndex: async (indexName, options) => {
      if (disableAllWrites) return;
      const table = this.getTable();
      await table.dropIndex(indexName, options);
    },
    indexes: async (options) => {
      const table = this.getTable();
      return await table.indexes(options);
    },
    update: async (selector, update, options) => {
      if (disableAllWrites) return;
      const table = this.getTable();
      return await table.update(selector, update, options);
    },
  })
}
