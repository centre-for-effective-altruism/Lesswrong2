import * as _ from 'underscore';
import { defaultVisibilityTags } from './publicSettings';

export interface FilterSettings {
  personalBlog: FilterMode,
  tags: Array<FilterTag>,
}
export interface FilterTag {
  tagId: string,
  tagName: string,
  filterMode: FilterMode,
}
export type FilterMode = "Hidden"|"Default"|"Required"|number

console.log('defaultvisibilitytags', defaultVisibilityTags.get())
export const defaultFilterSettings: FilterSettings = {
  personalBlog: "Hidden",
  tags: defaultVisibilityTags.get(),
}
