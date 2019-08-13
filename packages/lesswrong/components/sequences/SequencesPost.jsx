import { Components, registerComponent } from 'meteor/vulcan:core';
import React from 'react';
import { useLocation } from '../../lib/routeUtil';

const SequencesPost = () => {
  const { query, params } = useLocation();
  const { postId, sequenceId } = params;
  
  const version = query.revision
  return <Components.PostsPageWrapper documentId={postId} sequenceId={sequenceId} version={version} />
};

registerComponent('SequencesPost', SequencesPost);
