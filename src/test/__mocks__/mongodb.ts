// MongoDB driver mock for Jest testing
// Create a mock constructor that returns proper mock objects
export const MongoClient = jest.fn(function (this: any) {
  // This will be overridden by mockImplementation in tests
  this.connect = jest.fn();
  this.close = jest.fn();
  this.db = jest.fn();
  return this;
}) as any as jest.MockedClass<any>;

export class MongoServerError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
    this.name = 'MongoServerError';
  }
}

export class Db {
  collection = jest.fn();
  admin = jest.fn();
  command = jest.fn();
}

export class Collection {
  insertOne = jest.fn();
  findOne = jest.fn();
  find = jest.fn();
  aggregate = jest.fn();
  updateOne = jest.fn();
  findOneAndUpdate = jest.fn();
  deleteOne = jest.fn();
  countDocuments = jest.fn();
  replaceOne = jest.fn();
}

export const EJSON = {
  stringify: jest.fn((val) => JSON.stringify(val)),
  parse: jest.fn((str) => JSON.parse(str)),
};

export class ObjectId {
  _id: string;
  constructor(id?: string) {
    this._id = id || Math.random().toString();
  }
  toString() {
    return this._id;
  }
}

export type Document = Record<string, unknown>;
export type ClientSession = Record<string, unknown>;
export type MongoClientOptions = Record<string, unknown>;







