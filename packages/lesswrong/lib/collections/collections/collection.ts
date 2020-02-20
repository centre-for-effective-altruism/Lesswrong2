import { createCollection } from '../../vulcan-lib';
import schema from './schema';
import { makeEditable } from '../../editor/make_editable';
import { addUniversalFields, getDefaultResolvers, getDefaultMutations } from '../../collectionUtils'

export const Collections = createCollection({
  collectionName: 'Collections',
  typeName: 'Collection',
  schema,
  resolvers: getDefaultResolvers('Collections'),
  mutations: getDefaultMutations('Collections'),
});

export const makeEditableOptions = {
  order: 20
}

makeEditable({
  collection: Collections,
  options: makeEditableOptions
})
addUniversalFields({collection: Collections})

export default Collections;