"use strict";
(() => {
  // node_modules/morphdom/dist/morphdom-esm.js
  var DOCUMENT_FRAGMENT_NODE = 11;
  function morphAttrs(fromNode, toNode) {
    var toNodeAttrs = toNode.attributes;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;
    if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE || fromNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
      return;
    }
    for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
      attr = toNodeAttrs[i];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      attrValue = attr.value;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        if (fromValue !== attrValue) {
          if (attr.prefix === "xmlns") {
            attrName = attr.name;
          }
          fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
        }
      } else {
        fromValue = fromNode.getAttribute(attrName);
        if (fromValue !== attrValue) {
          fromNode.setAttribute(attrName, attrValue);
        }
      }
    }
    var fromNodeAttrs = fromNode.attributes;
    for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
      attr = fromNodeAttrs[d];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          fromNode.removeAttributeNS(attrNamespaceURI, attrName);
        }
      } else {
        if (!toNode.hasAttribute(attrName)) {
          fromNode.removeAttribute(attrName);
        }
      }
    }
  }
  var range;
  var NS_XHTML = "http://www.w3.org/1999/xhtml";
  var doc = typeof document === "undefined" ? void 0 : document;
  var HAS_TEMPLATE_SUPPORT = !!doc && "content" in doc.createElement("template");
  var HAS_RANGE_SUPPORT = !!doc && doc.createRange && "createContextualFragment" in doc.createRange();
  function createFragmentFromTemplate(str) {
    var template = doc.createElement("template");
    template.innerHTML = str;
    return template.content.childNodes[0];
  }
  function createFragmentFromRange(str) {
    if (!range) {
      range = doc.createRange();
      range.selectNode(doc.body);
    }
    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
  }
  function createFragmentFromWrap(str) {
    var fragment = doc.createElement("body");
    fragment.innerHTML = str;
    return fragment.childNodes[0];
  }
  function toElement(str) {
    str = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      return createFragmentFromTemplate(str);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(str);
    }
    return createFragmentFromWrap(str);
  }
  function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;
    var fromCodeStart, toCodeStart;
    if (fromNodeName === toNodeName) {
      return true;
    }
    fromCodeStart = fromNodeName.charCodeAt(0);
    toCodeStart = toNodeName.charCodeAt(0);
    if (fromCodeStart <= 90 && toCodeStart >= 97) {
      return fromNodeName === toNodeName.toUpperCase();
    } else if (toCodeStart <= 90 && fromCodeStart >= 97) {
      return toNodeName === fromNodeName.toUpperCase();
    } else {
      return false;
    }
  }
  function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ? doc.createElement(name) : doc.createElementNS(namespaceURI, name);
  }
  function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
      var nextChild = curChild.nextSibling;
      toEl.appendChild(curChild);
      curChild = nextChild;
    }
    return toEl;
  }
  function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
      fromEl[name] = toEl[name];
      if (fromEl[name]) {
        fromEl.setAttribute(name, "");
      } else {
        fromEl.removeAttribute(name);
      }
    }
  }
  var specialElHandlers = {
    OPTION: function(fromEl, toEl) {
      var parentNode = fromEl.parentNode;
      if (parentNode) {
        var parentName = parentNode.nodeName.toUpperCase();
        if (parentName === "OPTGROUP") {
          parentNode = parentNode.parentNode;
          parentName = parentNode && parentNode.nodeName.toUpperCase();
        }
        if (parentName === "SELECT" && !parentNode.hasAttribute("multiple")) {
          if (fromEl.hasAttribute("selected") && !toEl.selected) {
            fromEl.setAttribute("selected", "selected");
            fromEl.removeAttribute("selected");
          }
          parentNode.selectedIndex = -1;
        }
      }
      syncBooleanAttrProp(fromEl, toEl, "selected");
    },
    INPUT: function(fromEl, toEl) {
      syncBooleanAttrProp(fromEl, toEl, "checked");
      syncBooleanAttrProp(fromEl, toEl, "disabled");
      if (fromEl.value !== toEl.value) {
        fromEl.value = toEl.value;
      }
      if (!toEl.hasAttribute("value")) {
        fromEl.removeAttribute("value");
      }
    },
    TEXTAREA: function(fromEl, toEl) {
      var newValue = toEl.value;
      if (fromEl.value !== newValue) {
        fromEl.value = newValue;
      }
      var firstChild = fromEl.firstChild;
      if (firstChild) {
        var oldValue = firstChild.nodeValue;
        if (oldValue == newValue || !newValue && oldValue == fromEl.placeholder) {
          return;
        }
        firstChild.nodeValue = newValue;
      }
    },
    SELECT: function(fromEl, toEl) {
      if (!toEl.hasAttribute("multiple")) {
        var selectedIndex = -1;
        var i = 0;
        var curChild = fromEl.firstChild;
        var optgroup;
        var nodeName;
        while (curChild) {
          nodeName = curChild.nodeName && curChild.nodeName.toUpperCase();
          if (nodeName === "OPTGROUP") {
            optgroup = curChild;
            curChild = optgroup.firstChild;
          } else {
            if (nodeName === "OPTION") {
              if (curChild.hasAttribute("selected")) {
                selectedIndex = i;
                break;
              }
              i++;
            }
            curChild = curChild.nextSibling;
            if (!curChild && optgroup) {
              curChild = optgroup.nextSibling;
              optgroup = null;
            }
          }
        }
        fromEl.selectedIndex = selectedIndex;
      }
    }
  };
  var ELEMENT_NODE = 1;
  var DOCUMENT_FRAGMENT_NODE$1 = 11;
  var TEXT_NODE = 3;
  var COMMENT_NODE = 8;
  function noop() {
  }
  function defaultGetNodeKey(node) {
    if (node) {
      return node.getAttribute && node.getAttribute("id") || node.id;
    }
  }
  function morphdomFactory(morphAttrs2) {
    return function morphdom2(fromNode, toNode, options) {
      if (!options) {
        options = {};
      }
      if (typeof toNode === "string") {
        if (fromNode.nodeName === "#document" || fromNode.nodeName === "HTML" || fromNode.nodeName === "BODY") {
          var toNodeHtml = toNode;
          toNode = doc.createElement("html");
          toNode.innerHTML = toNodeHtml;
        } else {
          toNode = toElement(toNode);
        }
      }
      var getNodeKey = options.getNodeKey || defaultGetNodeKey;
      var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
      var onNodeAdded = options.onNodeAdded || noop;
      var onBeforeElUpdated = options.onBeforeElUpdated || noop;
      var onElUpdated = options.onElUpdated || noop;
      var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
      var onNodeDiscarded = options.onNodeDiscarded || noop;
      var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
      var childrenOnly = options.childrenOnly === true;
      var fromNodesLookup = /* @__PURE__ */ Object.create(null);
      var keyedRemovalList = [];
      function addKeyedRemoval(key) {
        keyedRemovalList.push(key);
      }
      function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = void 0;
            if (skipKeyedNodes && (key = getNodeKey(curChild))) {
              addKeyedRemoval(key);
            } else {
              onNodeDiscarded(curChild);
              if (curChild.firstChild) {
                walkDiscardedChildNodes(curChild, skipKeyedNodes);
              }
            }
            curChild = curChild.nextSibling;
          }
        }
      }
      function removeNode(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
          return;
        }
        if (parentNode) {
          parentNode.removeChild(node);
        }
        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
      }
      function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = getNodeKey(curChild);
            if (key) {
              fromNodesLookup[key] = curChild;
            }
            indexTree(curChild);
            curChild = curChild.nextSibling;
          }
        }
      }
      indexTree(fromNode);
      function handleNodeAdded(el) {
        onNodeAdded(el);
        var curChild = el.firstChild;
        while (curChild) {
          var nextSibling = curChild.nextSibling;
          var key = getNodeKey(curChild);
          if (key) {
            var unmatchedFromEl = fromNodesLookup[key];
            if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
              curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
              morphEl(unmatchedFromEl, curChild);
            } else {
              handleNodeAdded(curChild);
            }
          } else {
            handleNodeAdded(curChild);
          }
          curChild = nextSibling;
        }
      }
      function cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey) {
        while (curFromNodeChild) {
          var fromNextSibling = curFromNodeChild.nextSibling;
          if (curFromNodeKey = getNodeKey(curFromNodeChild)) {
            addKeyedRemoval(curFromNodeKey);
          } else {
            removeNode(curFromNodeChild, fromEl, true);
          }
          curFromNodeChild = fromNextSibling;
        }
      }
      function morphEl(fromEl, toEl, childrenOnly2) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
          delete fromNodesLookup[toElKey];
        }
        if (!childrenOnly2) {
          if (onBeforeElUpdated(fromEl, toEl) === false) {
            return;
          }
          morphAttrs2(fromEl, toEl);
          onElUpdated(fromEl);
          if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
            return;
          }
        }
        if (fromEl.nodeName !== "TEXTAREA") {
          morphChildren(fromEl, toEl);
        } else {
          specialElHandlers.TEXTAREA(fromEl, toEl);
        }
      }
      function morphChildren(fromEl, toEl) {
        var curToNodeChild = toEl.firstChild;
        var curFromNodeChild = fromEl.firstChild;
        var curToNodeKey;
        var curFromNodeKey;
        var fromNextSibling;
        var toNextSibling;
        var matchingFromEl;
        outer:
          while (curToNodeChild) {
            toNextSibling = curToNodeChild.nextSibling;
            curToNodeKey = getNodeKey(curToNodeChild);
            while (curFromNodeChild) {
              fromNextSibling = curFromNodeChild.nextSibling;
              if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              curFromNodeKey = getNodeKey(curFromNodeChild);
              var curFromNodeType = curFromNodeChild.nodeType;
              var isCompatible = void 0;
              if (curFromNodeType === curToNodeChild.nodeType) {
                if (curFromNodeType === ELEMENT_NODE) {
                  if (curToNodeKey) {
                    if (curToNodeKey !== curFromNodeKey) {
                      if (matchingFromEl = fromNodesLookup[curToNodeKey]) {
                        if (fromNextSibling === matchingFromEl) {
                          isCompatible = false;
                        } else {
                          fromEl.insertBefore(matchingFromEl, curFromNodeChild);
                          if (curFromNodeKey) {
                            addKeyedRemoval(curFromNodeKey);
                          } else {
                            removeNode(curFromNodeChild, fromEl, true);
                          }
                          curFromNodeChild = matchingFromEl;
                        }
                      } else {
                        isCompatible = false;
                      }
                    }
                  } else if (curFromNodeKey) {
                    isCompatible = false;
                  }
                  isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                  if (isCompatible) {
                    morphEl(curFromNodeChild, curToNodeChild);
                  }
                } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                  isCompatible = true;
                  if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                    curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                  }
                }
              }
              if (isCompatible) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              if (curFromNodeKey) {
                addKeyedRemoval(curFromNodeKey);
              } else {
                removeNode(curFromNodeChild, fromEl, true);
              }
              curFromNodeChild = fromNextSibling;
            }
            if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
              fromEl.appendChild(matchingFromEl);
              morphEl(matchingFromEl, curToNodeChild);
            } else {
              var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
              if (onBeforeNodeAddedResult !== false) {
                if (onBeforeNodeAddedResult) {
                  curToNodeChild = onBeforeNodeAddedResult;
                }
                if (curToNodeChild.actualize) {
                  curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                }
                fromEl.appendChild(curToNodeChild);
                handleNodeAdded(curToNodeChild);
              }
            }
            curToNodeChild = toNextSibling;
            curFromNodeChild = fromNextSibling;
          }
        cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey);
        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
          specialElHandler(fromEl, toEl);
        }
      }
      var morphedNode = fromNode;
      var morphedNodeType = morphedNode.nodeType;
      var toNodeType = toNode.nodeType;
      if (!childrenOnly) {
        if (morphedNodeType === ELEMENT_NODE) {
          if (toNodeType === ELEMENT_NODE) {
            if (!compareNodeNames(fromNode, toNode)) {
              onNodeDiscarded(fromNode);
              morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
            }
          } else {
            morphedNode = toNode;
          }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) {
          if (toNodeType === morphedNodeType) {
            if (morphedNode.nodeValue !== toNode.nodeValue) {
              morphedNode.nodeValue = toNode.nodeValue;
            }
            return morphedNode;
          } else {
            morphedNode = toNode;
          }
        }
      }
      if (morphedNode === toNode) {
        onNodeDiscarded(fromNode);
      } else {
        if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
          return;
        }
        morphEl(morphedNode, toNode, childrenOnly);
        if (keyedRemovalList) {
          for (var i = 0, len = keyedRemovalList.length; i < len; i++) {
            var elToRemove = fromNodesLookup[keyedRemovalList[i]];
            if (elToRemove) {
              removeNode(elToRemove, elToRemove.parentNode, false);
            }
          }
        }
      }
      if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
          morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
      }
      return morphedNode;
    };
  }
  var morphdom = morphdomFactory(morphAttrs);
  var morphdom_esm_default = morphdom;

  // node_modules/reconnecting-websocket/dist/reconnecting-websocket-mjs.js
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (b2.hasOwnProperty(p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  function __extends(d, b) {
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }
  function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m)
      return m.call(o);
    return {
      next: function() {
        if (o && i >= o.length)
          o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
  }
  function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m)
      return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
        ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"]))
          m.call(i);
      } finally {
        if (e)
          throw e.error;
      }
    }
    return ar;
  }
  function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
    return ar;
  }
  var Event = function() {
    function Event3(type, target) {
      this.target = target;
      this.type = type;
    }
    return Event3;
  }();
  var ErrorEvent = function(_super) {
    __extends(ErrorEvent3, _super);
    function ErrorEvent3(error, target) {
      var _this = _super.call(this, "error", target) || this;
      _this.message = error.message;
      _this.error = error;
      return _this;
    }
    return ErrorEvent3;
  }(Event);
  var CloseEvent = function(_super) {
    __extends(CloseEvent3, _super);
    function CloseEvent3(code, reason, target) {
      if (code === void 0) {
        code = 1e3;
      }
      if (reason === void 0) {
        reason = "";
      }
      var _this = _super.call(this, "close", target) || this;
      _this.wasClean = true;
      _this.code = code;
      _this.reason = reason;
      return _this;
    }
    return CloseEvent3;
  }(Event);
  var getGlobalWebSocket = function() {
    if (typeof WebSocket !== "undefined") {
      return WebSocket;
    }
  };
  var isWebSocket = function(w) {
    return typeof w !== "undefined" && !!w && w.CLOSING === 2;
  };
  var DEFAULT = {
    maxReconnectionDelay: 1e4,
    minReconnectionDelay: 1e3 + Math.random() * 4e3,
    minUptime: 5e3,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4e3,
    maxRetries: Infinity,
    maxEnqueuedMessages: Infinity,
    startClosed: false,
    debug: false
  };
  var ReconnectingWebSocket = function() {
    function ReconnectingWebSocket2(url, protocols, options) {
      var _this = this;
      if (options === void 0) {
        options = {};
      }
      this._listeners = {
        error: [],
        message: [],
        open: [],
        close: []
      };
      this._retryCount = -1;
      this._shouldReconnect = true;
      this._connectLock = false;
      this._binaryType = "blob";
      this._closeCalled = false;
      this._messageQueue = [];
      this.onclose = null;
      this.onerror = null;
      this.onmessage = null;
      this.onopen = null;
      this._handleOpen = function(event) {
        _this._debug("open event");
        var _a = _this._options.minUptime, minUptime = _a === void 0 ? DEFAULT.minUptime : _a;
        clearTimeout(_this._connectTimeout);
        _this._uptimeTimeout = setTimeout(function() {
          return _this._acceptOpen();
        }, minUptime);
        _this._ws.binaryType = _this._binaryType;
        _this._messageQueue.forEach(function(message) {
          return _this._ws.send(message);
        });
        _this._messageQueue = [];
        if (_this.onopen) {
          _this.onopen(event);
        }
        _this._listeners.open.forEach(function(listener) {
          return _this._callEventListener(event, listener);
        });
      };
      this._handleMessage = function(event) {
        _this._debug("message event");
        if (_this.onmessage) {
          _this.onmessage(event);
        }
        _this._listeners.message.forEach(function(listener) {
          return _this._callEventListener(event, listener);
        });
      };
      this._handleError = function(event) {
        _this._debug("error event", event.message);
        _this._disconnect(void 0, event.message === "TIMEOUT" ? "timeout" : void 0);
        if (_this.onerror) {
          _this.onerror(event);
        }
        _this._debug("exec error listeners");
        _this._listeners.error.forEach(function(listener) {
          return _this._callEventListener(event, listener);
        });
        _this._connect();
      };
      this._handleClose = function(event) {
        _this._debug("close event");
        _this._clearTimeouts();
        if (_this._shouldReconnect) {
          _this._connect();
        }
        if (_this.onclose) {
          _this.onclose(event);
        }
        _this._listeners.close.forEach(function(listener) {
          return _this._callEventListener(event, listener);
        });
      };
      this._url = url;
      this._protocols = protocols;
      this._options = options;
      if (this._options.startClosed) {
        this._shouldReconnect = false;
      }
      this._connect();
    }
    Object.defineProperty(ReconnectingWebSocket2, "CONNECTING", {
      get: function() {
        return 0;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2, "OPEN", {
      get: function() {
        return 1;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2, "CLOSING", {
      get: function() {
        return 2;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2, "CLOSED", {
      get: function() {
        return 3;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "CONNECTING", {
      get: function() {
        return ReconnectingWebSocket2.CONNECTING;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "OPEN", {
      get: function() {
        return ReconnectingWebSocket2.OPEN;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "CLOSING", {
      get: function() {
        return ReconnectingWebSocket2.CLOSING;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "CLOSED", {
      get: function() {
        return ReconnectingWebSocket2.CLOSED;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "binaryType", {
      get: function() {
        return this._ws ? this._ws.binaryType : this._binaryType;
      },
      set: function(value) {
        this._binaryType = value;
        if (this._ws) {
          this._ws.binaryType = value;
        }
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "retryCount", {
      get: function() {
        return Math.max(this._retryCount, 0);
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "bufferedAmount", {
      get: function() {
        var bytes = this._messageQueue.reduce(function(acc, message) {
          if (typeof message === "string") {
            acc += message.length;
          } else if (message instanceof Blob) {
            acc += message.size;
          } else {
            acc += message.byteLength;
          }
          return acc;
        }, 0);
        return bytes + (this._ws ? this._ws.bufferedAmount : 0);
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "extensions", {
      get: function() {
        return this._ws ? this._ws.extensions : "";
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "protocol", {
      get: function() {
        return this._ws ? this._ws.protocol : "";
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "readyState", {
      get: function() {
        if (this._ws) {
          return this._ws.readyState;
        }
        return this._options.startClosed ? ReconnectingWebSocket2.CLOSED : ReconnectingWebSocket2.CONNECTING;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(ReconnectingWebSocket2.prototype, "url", {
      get: function() {
        return this._ws ? this._ws.url : "";
      },
      enumerable: true,
      configurable: true
    });
    ReconnectingWebSocket2.prototype.close = function(code, reason) {
      if (code === void 0) {
        code = 1e3;
      }
      this._closeCalled = true;
      this._shouldReconnect = false;
      this._clearTimeouts();
      if (!this._ws) {
        this._debug("close enqueued: no ws instance");
        return;
      }
      if (this._ws.readyState === this.CLOSED) {
        this._debug("close: already closed");
        return;
      }
      this._ws.close(code, reason);
    };
    ReconnectingWebSocket2.prototype.reconnect = function(code, reason) {
      this._shouldReconnect = true;
      this._closeCalled = false;
      this._retryCount = -1;
      if (!this._ws || this._ws.readyState === this.CLOSED) {
        this._connect();
      } else {
        this._disconnect(code, reason);
        this._connect();
      }
    };
    ReconnectingWebSocket2.prototype.send = function(data) {
      if (this._ws && this._ws.readyState === this.OPEN) {
        this._debug("send", data);
        this._ws.send(data);
      } else {
        var _a = this._options.maxEnqueuedMessages, maxEnqueuedMessages = _a === void 0 ? DEFAULT.maxEnqueuedMessages : _a;
        if (this._messageQueue.length < maxEnqueuedMessages) {
          this._debug("enqueue", data);
          this._messageQueue.push(data);
        }
      }
    };
    ReconnectingWebSocket2.prototype.addEventListener = function(type, listener) {
      if (this._listeners[type]) {
        this._listeners[type].push(listener);
      }
    };
    ReconnectingWebSocket2.prototype.dispatchEvent = function(event) {
      var e_1, _a;
      var listeners = this._listeners[event.type];
      if (listeners) {
        try {
          for (var listeners_1 = __values(listeners), listeners_1_1 = listeners_1.next(); !listeners_1_1.done; listeners_1_1 = listeners_1.next()) {
            var listener = listeners_1_1.value;
            this._callEventListener(event, listener);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (listeners_1_1 && !listeners_1_1.done && (_a = listeners_1.return))
              _a.call(listeners_1);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
      }
      return true;
    };
    ReconnectingWebSocket2.prototype.removeEventListener = function(type, listener) {
      if (this._listeners[type]) {
        this._listeners[type] = this._listeners[type].filter(function(l) {
          return l !== listener;
        });
      }
    };
    ReconnectingWebSocket2.prototype._debug = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      if (this._options.debug) {
        console.log.apply(console, __spread(["RWS>"], args));
      }
    };
    ReconnectingWebSocket2.prototype._getNextDelay = function() {
      var _a = this._options, _b = _a.reconnectionDelayGrowFactor, reconnectionDelayGrowFactor = _b === void 0 ? DEFAULT.reconnectionDelayGrowFactor : _b, _c = _a.minReconnectionDelay, minReconnectionDelay = _c === void 0 ? DEFAULT.minReconnectionDelay : _c, _d = _a.maxReconnectionDelay, maxReconnectionDelay = _d === void 0 ? DEFAULT.maxReconnectionDelay : _d;
      var delay = 0;
      if (this._retryCount > 0) {
        delay = minReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, this._retryCount - 1);
        if (delay > maxReconnectionDelay) {
          delay = maxReconnectionDelay;
        }
      }
      this._debug("next delay", delay);
      return delay;
    };
    ReconnectingWebSocket2.prototype._wait = function() {
      var _this = this;
      return new Promise(function(resolve) {
        setTimeout(resolve, _this._getNextDelay());
      });
    };
    ReconnectingWebSocket2.prototype._getNextUrl = function(urlProvider) {
      if (typeof urlProvider === "string") {
        return Promise.resolve(urlProvider);
      }
      if (typeof urlProvider === "function") {
        var url = urlProvider();
        if (typeof url === "string") {
          return Promise.resolve(url);
        }
        if (!!url.then) {
          return url;
        }
      }
      throw Error("Invalid URL");
    };
    ReconnectingWebSocket2.prototype._connect = function() {
      var _this = this;
      if (this._connectLock || !this._shouldReconnect) {
        return;
      }
      this._connectLock = true;
      var _a = this._options, _b = _a.maxRetries, maxRetries = _b === void 0 ? DEFAULT.maxRetries : _b, _c = _a.connectionTimeout, connectionTimeout = _c === void 0 ? DEFAULT.connectionTimeout : _c, _d = _a.WebSocket, WebSocket2 = _d === void 0 ? getGlobalWebSocket() : _d;
      if (this._retryCount >= maxRetries) {
        this._debug("max retries reached", this._retryCount, ">=", maxRetries);
        return;
      }
      this._retryCount++;
      this._debug("connect", this._retryCount);
      this._removeListeners();
      if (!isWebSocket(WebSocket2)) {
        throw Error("No valid WebSocket class provided");
      }
      this._wait().then(function() {
        return _this._getNextUrl(_this._url);
      }).then(function(url) {
        if (_this._closeCalled) {
          return;
        }
        _this._debug("connect", { url, protocols: _this._protocols });
        _this._ws = _this._protocols ? new WebSocket2(url, _this._protocols) : new WebSocket2(url);
        _this._ws.binaryType = _this._binaryType;
        _this._connectLock = false;
        _this._addListeners();
        _this._connectTimeout = setTimeout(function() {
          return _this._handleTimeout();
        }, connectionTimeout);
      });
    };
    ReconnectingWebSocket2.prototype._handleTimeout = function() {
      this._debug("timeout event");
      this._handleError(new ErrorEvent(Error("TIMEOUT"), this));
    };
    ReconnectingWebSocket2.prototype._disconnect = function(code, reason) {
      if (code === void 0) {
        code = 1e3;
      }
      this._clearTimeouts();
      if (!this._ws) {
        return;
      }
      this._removeListeners();
      try {
        this._ws.close(code, reason);
        this._handleClose(new CloseEvent(code, reason, this));
      } catch (error) {
      }
    };
    ReconnectingWebSocket2.prototype._acceptOpen = function() {
      this._debug("accept open");
      this._retryCount = 0;
    };
    ReconnectingWebSocket2.prototype._callEventListener = function(event, listener) {
      if ("handleEvent" in listener) {
        listener.handleEvent(event);
      } else {
        listener(event);
      }
    };
    ReconnectingWebSocket2.prototype._removeListeners = function() {
      if (!this._ws) {
        return;
      }
      this._debug("removeListeners");
      this._ws.removeEventListener("open", this._handleOpen);
      this._ws.removeEventListener("close", this._handleClose);
      this._ws.removeEventListener("message", this._handleMessage);
      this._ws.removeEventListener("error", this._handleError);
    };
    ReconnectingWebSocket2.prototype._addListeners = function() {
      if (!this._ws) {
        return;
      }
      this._debug("addListeners");
      this._ws.addEventListener("open", this._handleOpen);
      this._ws.addEventListener("close", this._handleClose);
      this._ws.addEventListener("message", this._handleMessage);
      this._ws.addEventListener("error", this._handleError);
    };
    ReconnectingWebSocket2.prototype._clearTimeouts = function() {
      clearTimeout(this._connectTimeout);
      clearTimeout(this._uptimeTimeout);
    };
    return ReconnectingWebSocket2;
  }();
  var reconnecting_websocket_mjs_default = ReconnectingWebSocket;

  // src/live_view.ts
  var LiveView = class {
    constructor(url) {
      this.url = url;
      this.socket = new reconnecting_websocket_mjs_default(url, [], { startClosed: true });
      this.socket.addEventListener("open", this.onSocketConnected);
      this.socket.addEventListener("message", this.onSocketMessage.bind(this));
      this.socket.addEventListener("error", this.onSocketError);
      this.socket.addEventListener("close", this.onSocketClosed);
    }
    socket;
    connect() {
      this.socket.reconnect();
    }
    onSocketConnected(e) {
      console.log(e);
    }
    onSocketMessage(e) {
      this.dispatch(JSON.parse(e.data));
    }
    onSocketError(e) {
      console.log(e);
    }
    onSocketClosed(e) {
      console.log(e);
    }
    boost(element) {
      this.boostClicks(element);
    }
    boostClicks(element) {
      element.querySelectorAll("[live-click]").forEach((node) => {
        const method = node.attributes.getNamedItem("live-click").value;
        node.addEventListener("click", (ev) => {
          ev.preventDefault();
          const params = {};
          Array.from(node.attributes).forEach((attr) => {
            if (attr.name.startsWith("live-value")) {
              params[attr.name.replace("live-value-", "")] = attr.value;
            }
          });
          this.sendCommand(method, params);
        });
      });
    }
    dispatch(message) {
      switch (message.method) {
        case "render":
          this.handleRender(message);
      }
    }
    sendCommand(method, params, options) {
      const format = options?.format || "json";
      const target = options?.target || "root";
      this.socket.send(JSON.stringify({
        "method": method,
        "params": params,
        "format": format,
        "target": target
      }));
    }
    handleRender(message) {
      let target = message.params.target == "root" ? "[live-root]" : message.params.target;
      const template = document.createElement("template");
      template.innerHTML = message.params.content;
      const targetSourceElement = template.content.querySelector("[live-root]");
      if (!targetSourceElement) {
        throw new Error(`[live] Cannot query target element for selector "${message.params.target}"`);
      }
      const targetElement = document.querySelector(target);
      if (!targetElement) {
        throw new Error(`[live] Cannot query target element for selector "${message.params.target}"`);
      }
      morphdom_esm_default(targetElement, targetSourceElement, {
        onBeforeNodeAdded(node) {
          console.log(node);
          return node;
        }
      });
    }
  };

  // src/main.ts
  document.addEventListener("DOMContentLoaded", () => {
    const protocol = window.location.protocol.replace("http", "ws");
    const url = `${protocol}//${window.location.host}${window.location.pathname}`;
    const view = new LiveView(url);
    view.connect();
    view.boost(document.body);
  });
})();
/*!
 * Reconnecting WebSocket
 * by Pedro Ladaria <pedro.ladaria@gmail.com>
 * https://github.com/pladaria/reconnecting-websocket
 * License MIT
 */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
