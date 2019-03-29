import { registerMigration, migrateDocuments } from './migrationUtils';
import { editableCollections, editableCollectionsFields } from '../../lib/editor/make_editable'
import { getCollection } from 'meteor/vulcan:core'
import { dataToWordCount } from '../editor/make_editable_callbacks';
import { Revisions } from '../../lib/index';

registerMigration({
  name: "computeWordCounts",
  idempotent: true,
  action: async () => {
    // Fill in wordCount in the Revisions table
    await migrateDocuments({
      description: `Compute word counts in the Revisions table`,
      collection: Revisions,
      batchSize: 1000,
      unmigratedDocumentQuery: {
        wordCount: {$exists: false}
      },
      
      migrate: async (documents) => {
        let updates = [];
        
        for (let doc of documents) {
          const { data, type } = doc.originalContents;
          const wordCount = await dataToWordCount(data, type);
          
          updates.push({
            updateOne: {
              filter: { _id: doc._id },
              update: {
                $set: {
                  wordCount: wordCount
                }
              }
            }
          });
        }
        
        await Revisions.rawCollection().bulkWrite(updates, { ordered: false });
      }
    });
    
    // Fill in wordCount in the denormalized latest revs on posts/comments/etc
    for (let collectionName of editableCollections) {
      for (let fieldName of editableCollectionsFields[collectionName]) {
        const collection = getCollection(collectionName)
        await migrateDocuments({
          description: `Compute word counts for ${collectionName}.${fieldName}`,
          collection,
          batchSize: 1000,
          unmigratedDocumentQuery: {
            [fieldName]: {$exists: true},
            [`${fieldName}.wordCount`]: {$exists: false}
          },
          migrate: async (documents) => {
            let updates = [];
            
            for (let doc of documents) {
              if (doc[fieldName]) {
                const { data, type } = doc[fieldName].originalContents;
                const wordCount = await dataToWordCount(data, type);
                updates.push({
                  updateOne: {
                    filter: { _id: doc._id },
                    update: {
                      $set: {
                        [`${fieldName}.wordCount`]: wordCount
                      }
                    }
                  }
                });
              }
            }
            await collection.rawCollection().bulkWrite(updates, { ordered: false });
          }
        })
      }
    }
  },
});