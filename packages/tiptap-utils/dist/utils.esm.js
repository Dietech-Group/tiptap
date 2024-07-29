
    /*!
    * tiptap-utils v1.13.1
    * (c) 2024 überdosis GbR (limited liability)
    * @license MIT
    */
  
import { NodeSelection } from 'prosemirror-state';

function createCell(cellType, cellContent) {
  if (cellContent) {
    return cellType.createChecked(null, cellContent);
  }

  return cellType.createAndFill();
}

function getTableNodeTypes(schema) {
  if (schema.cached.tableNodeTypes) {
    return schema.cached.tableNodeTypes;
  }

  const roles = {};
  Object.keys(schema.nodes).forEach(type => {
    const nodeType = schema.nodes[type];

    if (nodeType.spec.tableRole) {
      roles[nodeType.spec.tableRole] = nodeType;
    }
  }); // eslint-disable-next-line

  schema.cached.tableNodeTypes = roles;
  return roles;
}

function createTable(schema, rowsCount, colsCount, withHeaderRow, cellContent) {
  const types = getTableNodeTypes(schema);
  const headerCells = [];
  const cells = [];

  for (let index = 0; index < colsCount; index += 1) {
    const cell = createCell(types.cell, cellContent);

    if (cell) {
      cells.push(cell);
    }

    if (withHeaderRow) {
      const headerCell = createCell(types.header_cell, cellContent);

      if (headerCell) {
        headerCells.push(headerCell);
      }
    }
  }

  const rows = [];

  for (let index = 0; index < rowsCount; index += 1) {
    rows.push(types.row.createChecked(null, withHeaderRow && index === 0 ? headerCells : cells));
  }

  return types.table.createChecked(null, rows);
}

function equalNodeType(nodeType, node) {
  return Array.isArray(nodeType) && nodeType.indexOf(node.type) > -1 || node.type === nodeType;
}

function flatten(node) {
  // eslint-disable-next-line
  const descend = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (!node) {
    throw new Error('Invalid "node" parameter');
  }

  const result = []; // eslint-disable-next-line

  node.descendants((child, pos) => {
    result.push({
      node: child,
      pos
    });

    if (!descend) {
      return false;
    }
  });
  return result;
}

function findChildren(node, predicate, descend) {
  if (!node) {
    throw new Error('Invalid "node" parameter');
  } else if (!predicate) {
    throw new Error('Invalid "predicate" parameter');
  }

  return flatten(node, descend).filter(child => predicate(child.node));
}

function findBlockNodes(node, descend) {
  return findChildren(node, child => child.isBlock, descend);
}

// eslint-disable-next-line
function findParentNodeClosestToPos($pos, predicate) {
  for (let i = $pos.depth; i > 0; i -= 1) {
    const node = $pos.node(i);

    if (predicate(node)) {
      return {
        pos: i > 0 ? $pos.before(i) : 0,
        start: $pos.start(i),
        depth: i,
        node
      };
    }
  }
}

function findParentNode(predicate) {
  return selection => findParentNodeClosestToPos(selection.$from, predicate);
}

function isNodeSelection(selection) {
  return selection instanceof NodeSelection;
}

function findSelectedNodeOfType(nodeType) {
  // eslint-disable-next-line
  return function (selection) {
    if (isNodeSelection(selection)) {
      const {
        node
      } = selection;
      const {
        $from
      } = selection;

      if (equalNodeType(nodeType, node)) {
        return {
          node,
          pos: $from.pos,
          depth: $from.depth
        };
      }
    }
  };
}

function getMarkAttrs(state, type) {
  const {
    from,
    to
  } = state.selection;
  let marks = [];
  state.doc.nodesBetween(from, to, node => {
    marks = [...marks, ...node.marks];
  });
  const mark = marks.find(markItem => markItem.type.name === type.name);

  if (mark) {
    return mark.attrs;
  }

  return {};
}

function getMarkRange($pos = null, type = null) {
  if (!$pos || !type) {
    return false;
  }

  const start = $pos.parent.childAfter($pos.parentOffset);

  if (!start.node) {
    return false;
  }

  const link = start.node.marks.find(mark => mark.type === type);

  if (!link) {
    return false;
  }

  let startIndex = $pos.index();
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  while (startIndex > 0 && link.isInSet($pos.parent.child(startIndex - 1).marks)) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (endIndex < $pos.parent.childCount && link.isInSet($pos.parent.child(endIndex).marks)) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return {
    from: startPos,
    to: endPos
  };
}

function getNodeAttrs(state, type) {
  const {
    from,
    to
  } = state.selection;
  let nodes = [];
  state.doc.nodesBetween(from, to, node => {
    nodes = [...nodes, node];
  });
  const node = nodes.reverse().find(nodeItem => nodeItem.type.name === type.name);

  if (node) {
    return node.attrs;
  }

  return {};
}

function markIsActive(state, type) {
  const {
    from,
    $from,
    to,
    empty
  } = state.selection;

  if (empty) {
    return !!type.isInSet(state.storedMarks || $from.marks());
  }

  return !!state.doc.rangeHasMark(from, to, type);
}

function nodeEqualsType({
  types,
  node
}) {
  return Array.isArray(types) && types.includes(node.type) || node.type === types;
}

function nodeIsActive(state, type, attrs = {}) {
  const predicate = node => node.type === type;

  const node = findSelectedNodeOfType(type)(state.selection) || findParentNode(predicate)(state.selection);

  if (!Object.keys(attrs).length || !node) {
    return !!node;
  }

  return node.node.hasMarkup(type, { ...node.node.attrs,
    ...attrs
  });
}

export { createCell, createTable, equalNodeType, findBlockNodes, findChildren, findParentNode, findParentNodeClosestToPos, findSelectedNodeOfType, flatten, getMarkAttrs, getMarkRange, getNodeAttrs, getTableNodeTypes, isNodeSelection, markIsActive, nodeEqualsType, nodeIsActive };
