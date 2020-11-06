// Modified From: https://github.com/rafrex/react-router-hash-link/blob/master/src/index.js

import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-restricted-imports
import { Link, NavLink } from 'react-router-dom';

let hashFragment = '';
let observer:null|MutationObserver = null;
let asyncTimerId:null|number = null;
let scrollFunction:null|((el:HTMLElement) => void) = null;

function reset() {
  hashFragment = '';
  if (observer) {observer.disconnect();}
  if (asyncTimerId !== null) {
    window.clearTimeout(asyncTimerId);
    asyncTimerId = null;
  }
}

function getElAndScroll() {
  const element = document.getElementById(hashFragment);
  if (element !== null && scrollFunction !== null) {
    scrollFunction(element);
    reset();
    return true;
  }
  return false;
}

function hashLinkScroll() {
  // Push onto callback queue so it runs after the DOM is updated
  window.setTimeout(() => {
    if (getElAndScroll() === false) {
      if (observer === null) {
        // We check for mutations of the DOM in order to scroll correctly to elements that are only rendered after a bit of a delay
        observer = new MutationObserver(getElAndScroll);
      }
      observer.observe(document, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      // if the element doesn't show up in 10 seconds, stop checking
      asyncTimerId = window.setTimeout(() => {
        reset();
      }, 10000);
    }
  }, 0);
}

export function genericHashLink(props, As) {
  function handleClick(e) {
    reset();
    if (props.onClick) props.onClick(e);
    if (typeof props.to === 'string') {
      hashFragment = props.to
        .split('#')
        .slice(1)
        .join('#');
    } else if (
      typeof props.to === 'object' &&
      typeof props.to.hash === 'string'
    ) {
      hashFragment = props.to.hash.replace('#', '');
    }
    if (hashFragment !== '') {
      scrollFunction =
        props.scroll ||
        (el =>
          props.smooth
            ? el.scrollIntoView({ behavior: "smooth" })
            : el.scrollIntoView());
      hashLinkScroll();
    }
  }
  const { scroll, smooth, ...filteredProps } = props;

  return (
    <As {...filteredProps} onClick={handleClick}>
      {props.children}
    </As>
  );
}

export function HashLink(props) {
  // React router links don't handle external URLs, so use a
  // normal HTML a tag if the URL is external
  const externalLink = /https?:\/\//.test(props.to)
  const Element = externalLink ? 
    ({to, ...rest}) => <a href={to} target="_blank" rel="noopener" {...rest} />
    : Link;

  return genericHashLink(props, Element);
}

export function NavHashLink(props) {
  return genericHashLink(props, NavLink);
}

const propTypes = {
  onClick: PropTypes.func,
  children: PropTypes.any,
  scroll: PropTypes.func,
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

HashLink.propTypes = propTypes;
NavHashLink.propTypes = propTypes;
