import babel, { PluginObj, types } from '@babel/core';

const SUPPORTED_HOCS = ['forwardRef', 'memo'];

const isAnonymousComponent = (
  t: typeof types,
  callee: types.Expression | types.V8IntrinsicIdentifier
) =>
  // memo((props) => *) case
  (t.isIdentifier(callee) && SUPPORTED_HOCS.includes(callee.name)) ||
  // React.memo((props) => *) case
  (t.isMemberExpression(callee) &&
    SUPPORTED_HOCS.includes(callee.property.name));

export default ({ types: t }: typeof babel): PluginObj => ({
  visitor: {
    VariableDeclarator(path) {
      if (
        t.isIdentifier(path.node.id) &&
        t.isCallExpression(path.node.init) &&
        t.isArrowFunctionExpression(path.node.init.arguments[0]) &&
        isAnonymousComponent(t, path.node.init.callee)
      ) {
        path.replaceWith(
          t.variableDeclarator(
            t.identifier(path.node.id.name),
            t.callExpression(path.node.init.callee, [
              t.functionExpression(
                t.identifier(path.node.id.name),
                path.node.init.arguments[0].params,
                // is memo((props) => { return *; }) case
                t.isBlockStatement(path.node.init.arguments[0].body)
                  ? path.node.init.arguments[0].body
                  : t.blockStatement([
                      t.returnStatement(path.node.init.arguments[0].body)
                    ])
              )
            ])
          )
        );
      }
    }
  }
});
