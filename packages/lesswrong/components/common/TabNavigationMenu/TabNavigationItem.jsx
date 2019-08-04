import { registerComponent, Components } from 'meteor/vulcan:core';
import React from 'react';
import { withRouter } from '../../../lib/reactRouterWrapper.js';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import { Link } from '../../../lib/reactRouterWrapper.js';
import classNames from 'classnames';
import Tooltip from '@material-ui/core/Tooltip';

export const iconWidth = 30

const styles = theme => ({
  selected: {
    '& $icon': {
      opacity: 1,
    },
    '& $navText': {
      color: theme.palette.grey[900],
      fontWeight: 600,
    },
  },
  navButton: {
    '&:hover': {
      opacity:.6
    },
    paddingTop: theme.spacing.unit*1.5,
    paddingBottom: theme.spacing.unit*1.5,
    paddingLeft: theme.spacing.unit*2,
    paddingRight: theme.spacing.unit*2,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
  },
  subItemOverride: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  icon: {
    display: "block",
    opacity: .3,
    width: iconWidth,
    height: 28,
    marginRight: theme.spacing.unit*2,
    display: "inline",
  },
  navText: {
    ...theme.typography.body2,
    color: theme.palette.grey[600],
    textTransform: "none !important",
  },
  homeIcon: {
    '& svg': {
      height: 29,
      position: "relative",
      top: -1,
    }
  },
})

const TabNavigationItem = ({tab, onClick, classes}) => {
  const { TabNavigationSubItem } = Components
  const { pathname } = location

  return <Tooltip placement='right-start' title={tab.tooltip || ''}>
    <MenuItem
      onClick={onClick}
      component={Link} to={tab.link}
      disableGutters
      classes={{root: classNames({
        [classes.navButton]: !tab.subItem,
        [classes.subItemOverride]: tab.subItem,
        [classes.selected]: pathname === tab.link,
      })}}
    >
      {(tab.icon || tab.iconComponent) && <span
        className={classNames(classes.icon, {[classes.homeIcon]: tab.id === 'home'})}
      >
        {tab.iconComponent && <tab.iconComponent />}
        {tab.icon && tab.icon}
      </span>}
      {tab.subItem ?
        <TabNavigationSubItem>
          {tab.title}
        </TabNavigationSubItem> :
        <span className={classes.navText}>
          {tab.title}
        </span>
      }
    </MenuItem>
  </Tooltip>
}

registerComponent(
  'TabNavigationItem', TabNavigationItem,
  withRouter, withStyles(styles, { name: 'TabNavigationItem'})
);