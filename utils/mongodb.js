// Mock MongoDB implementation for development
// This allows the application to build without the actual MongoDB package

// Mock database collections
const collections = {
  whispers: [],
  audioData: []
};

// Mock database
const db = {
  collection: (name) => {
    if (!collections[name]) {
      collections[name] = [];
    }
    
    return {
      find: (query = {}) => {
        // Simple query implementation
        let results = [...collections[name]];
        
        // Filter by query if provided
        if (Object.keys(query).length > 0) {
          results = results.filter(item => {
            return Object.entries(query).every(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                // Handle nested objects (like $near queries)
                return true; // Simplified for mock
              }
              return item[key] === value;
            });
          });
        }
        
        return {
          project: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  toArray: async () => results
                })
              })
            })
          }),
          countDocuments: async () => results.length,
          findOne: async (query = {}) => {
            return results.find(item => {
              return Object.entries(query).every(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                  return true; // Simplified for mock
                }
                return item[key] === value;
              });
            });
          },
          insertOne: async (doc) => {
            collections[name].push(doc);
            return { insertedId: doc._id };
          },
          updateOne: async (query, update) => {
            const index = collections[name].findIndex(item => {
              return Object.entries(query).every(([key, value]) => {
                return item[key] === value;
              });
            });
            
            if (index !== -1) {
              collections[name][index] = { ...collections[name][index], ...update.$set };
              return { modifiedCount: 1 };
            }
            
            return { modifiedCount: 0 };
          },
          deleteOne: async (query) => {
            const index = collections[name].findIndex(item => {
              return Object.entries(query).every(([key, value]) => {
                return item[key] === value;
              });
            });
            
            if (index !== -1) {
              collections[name].splice(index, 1);
              return { deletedCount: 1 };
            }
            
            return { deletedCount: 0 };
          }
        };
      },
      command: async (cmd) => {
        if (cmd.ping) {
          return { ok: 1 };
        }
        return { ok: 0 };
      }
    };
  }
};

// Mock client
const client = {
  db: () => db,
  close: async () => {}
};

// Cache the database connection
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('Connecting to mock MongoDB...');
    
    // Use the mock client and db
    cachedClient = client;
    cachedDb = db;
    
    // Test the connection
    await db.command({ ping: 1 });
    console.log('Successfully connected to mock MongoDB');
    
    return { client, db };
  } catch (error) {
    console.error('Error connecting to mock MongoDB:', error);
    throw error;
  }
} 