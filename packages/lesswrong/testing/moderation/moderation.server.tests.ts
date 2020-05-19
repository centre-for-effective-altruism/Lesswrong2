import { chai, expect } from 'meteor/practicalmeteor:chai';
import chaiAsPromised from 'chai-as-promised';
import { runQuery } from '../../server/vulcan-lib';

import { createDummyUser, createDummyPost, createDummyComment, userUpdateFieldSucceeds, userUpdateFieldFails, catchGraphQLErrors, assertIsPermissionsFlavoredError } from '../utils'

chai.should();
chai.use(chaiAsPromised);

import Users from '../../lib/collections/users/collection';

describe('Users.userIsBannedFromPost --', async () => {
  it('returns false if post.bannedUserIds does not contain exist', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author)
    expect(Users.userIsBannedFromPost(user, post)).to.equal(false)
  })
  it('returns false if post.bannedUserIds does not contain user._id', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author, {bannedUserIds:['notUserId']})
    expect(Users.userIsBannedFromPost(user, post)).to.equal(false)
  })
  it('returns true if post.bannedUserIds contain user._id but post.user is NOT in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser()
    const post = await createDummyPost(author, {bannedUserIds:[user._id]})
    expect(Users.userIsBannedFromPost(user, post)).to.equal(true)
  })
  it('returns true if post.bannedUserIds contain user._id AND post.user is in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author, {bannedUserIds:[user._id]})
    expect(Users.userIsBannedFromPost(user, post)).to.equal(true)
  })
})
describe('Users.userIsBannedFromAllPosts --', async () => {
  it('returns false if post.user.bannedUserIds does not contain exist', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author)
    expect(Users.userIsBannedFromAllPosts(user, post)).to.equal(false)
  })
  it('returns false if post.bannedUserIds does not contain user._id', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1'], bannedUserIds:['notUserId']})
    const post = await createDummyPost(author)
    expect(Users.userIsBannedFromAllPosts(user, post)).to.equal(false)
  })
  it('returns false if post.bannedUserIds contain user._id but post.user is NOT in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({bannedUserIds:[user._id]})
    const post = await createDummyPost(author)
    expect(Users.userIsBannedFromAllPosts(user, post)).to.equal(false)
  })
  it('returns true if post.bannedUserIds contain user._id AND post.user is in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1'], bannedUserIds:[user._id]})
    const post = await createDummyPost(author)
    expect(Users.userIsBannedFromAllPosts(user, post)).to.equal(true)
  })
})
describe('Users.isAllowedToComment --', async () => {
  it('returns false if there is no user', async () => {
    const post = await createDummyPost()
    expect(Users.isAllowedToComment(undefined, post)).to.equal(false)
  })
  it('returns true if passed a user but NOT post', async () => {
    const user = await createDummyUser()
    expect(Users.isAllowedToComment(user, undefined)).to.equal(true)
  })
  it('returns true if passed a user AND post does NOT contain bannedUserIds OR user', async () => {
    const user = await createDummyUser()
    const post = await createDummyPost({userId:undefined})
    expect(Users.isAllowedToComment(user, post)).to.equal(true)
  })
  it('returns true if passed a user AND post contains bannedUserIds but NOT user', async () => {
    const user = await createDummyUser()
    const post = await createDummyPost({bannedUserIds:[user._id], userId: undefined})
    expect(Users.isAllowedToComment(user, post)).to.equal(true)
  })
  it('returns false if passed a user AND post contains bannedUserIds BUT post-user is NOT in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser()
    const post = await createDummyPost(author, {bannedUserIds:[user._id]})
    expect(Users.isAllowedToComment(user, post)).to.equal(false)
  })
  it('returns false if passed a user AND post contains bannedUserIds AND post-user is in trustLevel1', async () => {
    const user = await createDummyUser()
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author, {bannedUserIds:[user._id]})
    expect(Users.isAllowedToComment(user, post)).to.equal(false)
  })
})

describe('Posts Moderation --', async function() {
  let graphQLerrors = catchGraphQLErrors();
  this.timeout(10000)
  
  it('CommentsNew should succeed if user is not in bannedUserIds list', async function() {
    const user = await createDummyUser()
    const post = await createDummyPost()

    const query = `
      mutation CommentsNew {
        createComment(data:{postId: "${post._id}", contents: {originalContents: {type: "markdown", data: "test"}}}){
          data {
            postId
            contents {
              markdown
            }
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { createComment: {data: { postId: post._id, contents: { markdown:"test" } } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it('new comment on a post should fail if user in Post.bannedUserIds list', async () => {
    const user = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(user, {bannedUserIds:[user._id]})
    const query = `
      mutation CommentsNew {
        createComment(data:{postId: "${post._id}", contents: { originalContents: { type: "markdown", data: "test" } } }){
          data {
            contents {
              markdown
            }
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  });
  it('new comment on a post should fail if user in User.bannedUserIds list and post.user is in trustLevel1', async () => {
    const secondUser = await createDummyUser()
    const user = await createDummyUser({groups:['trustLevel1'], bannedUserIds:[secondUser._id]})
    const post = await createDummyPost(user)
    const query = `
      mutation CommentsNew {
        createComment(data:{postId:"${post._id}", contents: {originalContents: { type: "markdown", data: "test" } } }){
          data {
            contents {
              markdown
            }
            userId
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:secondUser})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  });
  it('new comment on a post should succeed if user in User.bannedUserIds list but post.user is NOT in trustLevel1', async () => {
    const secondUser = await createDummyUser()
    const user = await createDummyUser({bannedUserIds:[secondUser._id]})
    const post = await createDummyPost(user)
    const query = `
      mutation CommentsNew {
        createComment(data:{postId:"${post._id}", contents: { originalContents: {type: "markdown", data: "test" } } }){
          data {
            contents { 
              markdown
            }
            postId
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:secondUser})
    const expectedOutput = { data: { createComment: { data: {postId: post._id, contents: {markdown: "test"} } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
});

describe('User moderation fields --', async () => {
  let graphQLerrors = catchGraphQLErrors();
  
  it("new trusted users do not have a moderationStyle", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    expect(user.moderationStyle).to.equal(undefined)
  });
  it("non-trusted users can set their moderationStyle", async () => {
    const user = await createDummyUser()
    const query = `
    mutation UsersUpdate {
      updateUser(selector: {_id: "${user._id}"}, data: {moderationStyle:"easy-going"}) {
        data {
          moderationStyle
        }
      }
    }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: {data: { moderationStyle: "easy-going" } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it("non-trusted users can set their moderationGuidelines", async () => {
    const user = await createDummyUser()
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderationGuidelines: {originalContents: {type: "markdown", data: "blah"}}}) {
          data {
            moderationGuidelines {
              markdown
            }
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: { data: {moderationGuidelines: {markdown: "blah"} } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it("non-trusted users can set their moderatorAssistance", async () => {
    const user = await createDummyUser()
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderatorAssistance: true}) {
          data {
            moderatorAssistance
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: { data: {moderatorAssistance: true} } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it("trusted users can set their moderationStyle", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderationStyle:"easy-going"}) {
          data {
            moderationStyle
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: {data: { moderationStyle: "easy-going" } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it("trusted users can set their moderationGuidelines", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderationGuidelines: {originalContents: {type: "markdown", data: "blah"}}}) {
          data {
            moderationGuidelines {
              markdown
            }
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: { data: {moderationGuidelines: {markdown: "blah"}} } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });
  it("trusted users can set their moderatorAssistance", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderatorAssistance: true}) {
          data {
            moderatorAssistance
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: { data: {moderatorAssistance: true} } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  });

  it("trusted users can NOT set other user's moderationGuidelines", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const user2 = await createDummyUser({groups:["trustLevel1"]})
    const query = `
      mutation UsersUpdate {
        updateUser(selector: {_id: "${user._id}"}, data: {moderationGuidelines: {originalContents: {data:"assad", type: "markdown"}}}) {
          data {
            moderationGuidelines {
              markdown
            }
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user2})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  });
})

/*describe('PostsEdit bannedUserIds permissions --', async ()=> {
  let graphQLerrors = catchGraphQLErrors(beforeEach, afterEach);
  it("PostsEdit bannedUserIds should succeed if user in trustLevel1, owns post and has moderationGuidelines set on the post", async () => {
    const user = await createDummyUser({moderationStyle:"easy-going", groups:["trustLevel1"]})
    const post = await createDummyPost(user, {moderationGuidelines: {originalContents: {type: "html", data: "beware"}}})
    const testBannedUserIds = "test"
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id :"${post._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updatePost: { data: {bannedUserIds: [testBannedUserIds]} } } }
    return response.should.eventually.deep.equal(expectedOutput);
  })
  it("PostsEdit bannedUserIds should fail if user owns post, has set moderationStyle, and is NOT in trustLevel1", async () => {
    const user = await createDummyUser({moderationStyle:"easy-going"})
    const post = await createDummyPost(user)
    const testBannedUserIds = "test"
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id :"${post._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await response.should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("PostsEdit bannedUserIds should fail if user in TrustLevel1, has set moderationStyle, and does NOT own post", async () => {
    const user = await createDummyUser({moderationStyle:"easy-going", groups:["trustLevel1"]})
    const otherUser = await createDummyUser()
    const post = await createDummyPost(otherUser)
    const testBannedUserIds = "test"
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id :"${post._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await response.should.be.rejected
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("PostsEdit bannedUserIds should fail if user in trustLevel1, owns post, but has NOT set moderationStyle", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const post = await createDummyPost(user)
    const testBannedUserIds = "test"
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id :"${post._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await response.should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
})*/

describe('UsersEdit bannedUserIds permissions --', async ()=> {
  let graphQLerrors = catchGraphQLErrors(beforeEach, afterEach);
  
  it("usersEdit bannedUserIds should succeed if user in trustLevel1", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const testBannedUserIds = "test"
    const query = `
      mutation UsersEdit {
        updateUser(selector: {_id :"${user._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updateUser: { data: {bannedUserIds: ["test"] } } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  })
  it("usersEdit bannedUserIds should fail if user has set moderationStyle and in trustLevel1 but is NOT the target user ", async () => {
    const user = await createDummyUser({groups:["trustLevel1"], moderationStyle:"easy"})
    const user2 = await createDummyUser({groups:["trustLevel1"], moderationStyle:"easy"})
    const testBannedUserIds = "test"
    const query = `
      mutation UsersEdit {
        updateUser(selector: {_id :"${user._id}"},data: {bannedUserIds:["${testBannedUserIds}"]}) {
          data {
            bannedUserIds
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user2})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
})

describe('Users.canModeratePost --', async ()=> {
  // TODO - rewrite this to pass in user data based on fragments where this function is called
  it("returns false if user is undefined", async () => {
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author)
    expect(Users.canModeratePost(undefined, post)).to.be.false;
  })
  it("returns false if post is undefined", async () => {
    const author = await createDummyUser({groups:['trustLevel1']})
    expect(Users.canModeratePost(author, undefined)).to.be.false;
  })
  it("returns false if user not in trustLevel1, sunshineRegiment or admins", async () => {
    const author = await createDummyUser()
    const post = await createDummyPost(author)
    expect(Users.canModeratePost(author, post)).to.be.false;
  })
  it("returns false if user in trustLevel1 but does NOT own post", async () => {
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost()
    expect(Users.canModeratePost(author, post)).to.be.false;
  })
  it("returns false if user in trustLevel1 AND owns post but has NOT set user.moderationStyle", async () => {
    const author = await createDummyUser({groups:['trustLevel1']})
    const post = await createDummyPost(author)
    expect(Users.canModeratePost(author, post)).to.be.false;
  })
  it("returns true if user in trustLevel1 AND owns post AND has moderationGuidelines", async () => {
    const author = await createDummyUser({groups:['trustLevel1'], moderationStyle:"1"})
    const post = await createDummyPost(author, {moderationGuidelines: {originalContents: {type: "html", data: "beware"}}})
    expect(Users.canModeratePost(author, post)).to.be.true;
  })
  it("returns true if user in sunshineRegiment", async () => {
    const moderator = await createDummyUser({groups:['sunshineRegiment']})
    const post = await createDummyPost()
    expect(Users.canModeratePost(moderator, post)).to.be.true;
  })
})

describe('Users.canEditUsersBannedUserIds --', async ()=> {
  // TODO - rewrite this to pass in user data based on fragments where this function is called
  it("returns false if currentUser is undefined", async () => {
    expect(Users.canEditUsersBannedUserIds(undefined, Users.findOne())).to.be.false;
  })
  it("returns false if user not in trustLevel1", async () => {
    const user = await createDummyUser()
    expect(Users.canEditUsersBannedUserIds(user)).to.be.false;
  })
  it("returns false if user in trustLevel1 but does has NOT set user.moderationStyle", async () => {
    const user = await createDummyUser({groups:['trustLevel1']})
    expect(Users.canEditUsersBannedUserIds(user, user)).to.be.false;
  })
  it("returns true if user in trustLevel1 AND has set user.moderationStyle", async () => {
    const user = await createDummyUser({groups:['trustLevel1'], moderationStyle:"1"})
    expect(Users.canEditUsersBannedUserIds(user, user)).to.be.true;
  })
  it("returns true if user in sunshineRegiment", async () => {
    const user = await createDummyUser({groups:['sunshineRegiment']})
    expect(Users.canEditUsersBannedUserIds(user, user)).to.be.true;
  })
})

describe('Comments deleted permissions --', async function() {
  let graphQLerrors = catchGraphQLErrors(beforeEach, afterEach);
  this.timeout(10000)
  it("updateComment – Deleted should succeed if user in sunshineRegiment", async function() {
    const user = await createDummyUser({groups:["sunshineRegiment"]})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId: post._id})
    return userUpdateFieldSucceeds({ user:user, document:comment,
      fieldName:'deleted', newValue: true, collectionType: "Comment"
    })
  })
  it("CommentsEdit set Deleted should fail if user is trustLevel1 and has set moderationStyle", async () => {
    const user = await createDummyUser({groups:["trustLevel1"], moderationStyle:"easy"})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    await userUpdateFieldFails({ user:user, document:comment,
      fieldName:'deleted', newValue: true, collectionType: "Comment"
    })
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("CommentsEdit set Deleted should fail if user is alignmentForum", async () => {
    const user = await createDummyUser({groups:["alignmentForum"]})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    await userUpdateFieldFails({ user:user, document:comment, fieldName:'deleted', newValue: true, collectionType: "Comment"})
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("moderateComment set deleted should succeed if user in sunshineRegiment", async () => {
    const user = await createDummyUser({groups:["sunshineRegiment"]})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    const query = `
      mutation  {
        moderateComment(commentId:"${comment._id}",deleted:true) {
          deleted
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { moderateComment: { deleted: true } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  })
  it("set deleted should succeed if user in trustLevel1, has set moderationGuidelines and owns post", async () => {
    const user = await createDummyUser({groups:["trustLevel1"], moderationStyle:"easy"})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user, {moderationGuidelines: {originalContents: {type: "html", data: "beware"}}})
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    const query = `
      mutation  {
        moderateComment(commentId:"${comment._id}",deleted:true) {
          deleted
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { moderateComment: { deleted: true } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  })
  it("set deleted should fail if user in trustLevel1, owns post but NOT set moderationGuidelines", async () => {
    const user = await createDummyUser({groups:["trustLevel1"]})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    const query = `
      mutation  {
        moderateComment(commentId:"${comment._id}",deleted:true) {
          deleted
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("set deleted should fail if user in trustLevel1, has set moderationStyle but does NOT own post", async () => {
    const user = await createDummyUser({groups:["trustLevel1"], moderationStyle:"easy"})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(commentAuthor)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    const query = `
      mutation  {
        moderateComment(commentId:"${comment._id}",deleted:true) {
          deleted
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("set deleted should fail if user has set moderationStyle, owns post but is NOT in trustLevel1", async () => {
    const user = await createDummyUser({moderationStyle:"easy"})
    const commentAuthor = await createDummyUser()
    const post = await createDummyPost(user)
    const comment = await createDummyComment(commentAuthor, {postId:post._id})
    const query = `
      mutation  {
        moderateComment(commentId:"${comment._id}",deleted:true) {
          deleted
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
})

describe('CommentLock permissions --', async ()=> {
  let graphQLerrors = catchGraphQLErrors(beforeEach, afterEach);
  it("PostsEdit.commentLock should succeed if user in sunshineRegiment", async () => {
    const user = await createDummyUser({groups:["sunshineRegiment"]})
    const author = await createDummyUser()
    const post = await createDummyPost(author)
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id:"${post._id}"},data:{commentsLocked:true}) {
          data {
            commentsLocked
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    const expectedOutput = { data: { updatePost: { data: {commentsLocked: true} } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  })
  it("PostsEdit.commentLock should fail if user is rando", async () => {
    const user = await createDummyUser()
    const author = await createDummyUser()
    const post = await createDummyPost(author)
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id:"${post._id}"},data:{commentsLocked:true}) {
          data {
            commentsLocked
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("PostsEdit.commentLock should fail if author not in canCommentLock", async () => {
    const author = await createDummyUser()
    const post = await createDummyPost(author)
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id:"${post._id}"},data:{commentsLocked:true}) {
          data {
            commentsLocked
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:author})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  })
  it("PostsEdit.commentLock should fail if author in canCommentLock", async () => {
    // FIXME: Description says "should fail", but test body says it succeeds?
    const author = await createDummyUser({groups:["canCommentLock"]})
    const post = await createDummyPost(author)
    const query = `
      mutation PostsEdit {
        updatePost(selector: {_id:"${post._id}"},data:{commentsLocked:true}) {
          data {
            commentsLocked
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:author})
    const expectedOutput = { data: { updatePost: { data: {commentsLocked: true} } } }
    return (response as any).should.eventually.deep.equal(expectedOutput);
  })
  it("CommentsNew should fail if post is commentLocked", async () => {
    const user = await createDummyUser()
    const post = await createDummyPost(undefined, {commentsLocked:true})
    const query = `
      mutation CommentsNew {
        createComment(data:{postId:"${post._id}", contents: { originalContents: { type: "markdown", data: "test" } } }){
          data {
            postId
          }
        }
      }
    `;
    const response = runQuery(query, {}, {currentUser:user})
    await (response as any).should.be.rejected;
    assertIsPermissionsFlavoredError(graphQLerrors.getErrors());
  });

})
