import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

describe("app tab routes", () => {
  it("keeps every owner and agent route navigable", () => {
    const layoutPath = join(__dirname, "../app/(app)/_layout.tsx");
    const source = readFileSync(layoutPath, "utf8");
    const file = ts.createSourceFile(layoutPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const hiddenRoutes: string[] = [];

    const propertyName = (name: ts.PropertyName) =>
      ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;

    function visit(node: ts.Node) {
      if (
        ts.isJsxSelfClosingElement(node) &&
        ts.isPropertyAccessExpression(node.tagName) &&
        node.tagName.expression.getText(file) === "Tabs" &&
        node.tagName.name.text === "Screen"
      ) {
        const attributes = node.attributes.properties;
        const nameAttribute = attributes.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "name"
        );
        const routeName = nameAttribute?.initializer && ts.isStringLiteral(nameAttribute.initializer)
          ? nameAttribute.initializer.text
          : "<unknown>";
        const optionsAttribute = attributes.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "options"
        );
        const options = optionsAttribute?.initializer && ts.isJsxExpression(optionsAttribute.initializer)
          ? optionsAttribute.initializer.expression
          : undefined;
        const hasHiddenHref = options && ts.isObjectLiteralExpression(options) && options.properties.some(
          (property) =>
            ts.isPropertyAssignment(property) &&
            propertyName(property.name) === "href" &&
            property.initializer.kind === ts.SyntaxKind.NullKeyword
        );

        if (hasHiddenHref) hiddenRoutes.push(routeName);
      }
      ts.forEachChild(node, visit);
    }

    visit(file);
    expect(hiddenRoutes).toEqual([]);
  });
});
