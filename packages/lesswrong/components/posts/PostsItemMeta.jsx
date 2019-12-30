import { Components, registerComponent, getSetting } from 'meteor/vulcan:core';
import React from 'react';
import { useCurrentUser } from '../common/withUser';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import Tooltip from '@material-ui/core/Tooltip';
import moment from 'moment';
import { useTimezone } from '../common/withTimezone';

const styles = theme => ({
  read: {
    opacity: ".8"
  },
  karma: {
    minWidth:20,
    textAlign: "center",
    display: "inline-block",
  },
})

const DateWithoutTime = ({date}) => {
  const { timezone } = useTimezone();
  return <span>{moment(date).tz(timezone).format("MMM Do")}</span>
}

const PostsItemMeta = ({post, read, classes}) => {
  const currentUser = useCurrentUser();
  const { wordCount = 0 } = post.contents || {}
  const baseScore = getSetting('forumType') === 'AlignmentForum' ? post.afBaseScore : post.baseScore
  const afBaseScore = getSetting('forumType') !== 'AlignmentForum' && post.af ? post.afBaseScore : null
  const { MetaInfo, FormatDate, PostsStats, PostsUserAndCoauthors } = Components;
  return <span className={classNames({[classes.read]:read})}>

      <MetaInfo>
        <Tooltip title={<div>
          This post has { baseScore || 0 } karma<br/>
          ({ post.voteCount} votes)
        </div>}>
          <span className={classes.karma}>
            { baseScore || 0 }
          </span>
        </Tooltip>
      </MetaInfo>

      { post.isEvent && <MetaInfo>
        {post.startTime
          ? <Tooltip title={<Components.EventTime post={post} />}>
              <DateWithoutTime date={post.startTime} />
            </Tooltip>
          : <Tooltip title={<span>To Be Determined</span>}>
              <span>TBD</span>
            </Tooltip>}
      </MetaInfo>}

      { post.isEvent && <MetaInfo>
        <Components.EventVicinity post={post} />
      </MetaInfo>}

      { post.user && <MetaInfo>
        <PostsUserAndCoauthors post={post}/>
      </MetaInfo>}

      {post.postedAt && !post.isEvent && <MetaInfo>
        <FormatDate date={post.postedAt}/>
      </MetaInfo>}

      {!!wordCount && !post.isEvent && <MetaInfo>
        <Tooltip title={`${wordCount} words`}>
          <span>{parseInt(wordCount/300) || 1 } min read</span>
        </Tooltip>
      </MetaInfo>}

      { currentUser && currentUser.isAdmin &&
        <PostsStats post={post} />
      }

      { afBaseScore && <MetaInfo>
        <Tooltip title={<div>
          { afBaseScore } karma on alignmentforum.org
        </div>}>
          <span>Ω { afBaseScore }</span>
        </Tooltip>
      </MetaInfo>}
    </span>
};

registerComponent('PostsItemMeta', PostsItemMeta, withStyles(styles, {name: "PostsItemMeta"}))
