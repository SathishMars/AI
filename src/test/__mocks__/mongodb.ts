// Manual mock for MongoDB to avoid ES module issues in Jest
export const MongoClient = jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue({
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue({}),
      serverStatus: jest.fn().mockResolvedValue({
        connections: { current: 5, available: 10, totalCreated: 15 },
        uptime: 3600
      })
    }),
    stats: jest.fn().mockResolvedValue({
      collections: 3,
      dataSize: 1024,
      indexSize: 512
    }),
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    })
  }),
  on: jest.fn()
}));

export const MongoClientOptions = {};
export const Db = jest.fn();