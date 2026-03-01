'use strict';

const BUILTIN_TYPES = new Set([
    'Array',
    'ReadonlyArray',
    'Promise',
    'Record',
    'Partial',
    'Required',
    'Pick',
    'Omit',
    'Exclude',
    'Extract',
    'NonNullable',
    'ReturnType',
    'Parameters',
    'ConstructorParameters',
    'InstanceType',
    'ThisType',
    'Uppercase',
    'Lowercase',
    'Capitalize',
    'Uncapitalize',
    'Date',
    'Map',
    'Set',
    'Error'
]);

function isApplicationImport(sourceValue) {
    return /(^|\/)application\//.test(sourceValue);
}

function collectTypeReferences(typeNode, outNames, seen) {
    if (!typeNode || typeof typeNode !== 'object') {
        return;
    }
    if (seen.has(typeNode)) {
        return;
    }
    seen.add(typeNode);

    if (typeNode.type === 'TSTypeReference') {
        if (typeNode.typeName.type === 'Identifier') {
            outNames.add(typeNode.typeName.name);
        } else if (
            typeNode.typeName.type === 'TSQualifiedName' &&
            typeNode.typeName.left.type === 'Identifier'
        ) {
            outNames.add(typeNode.typeName.left.name);
        }
    }

    for (const value of Object.values(typeNode)) {
        if (!value) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const entry of value) {
                collectTypeReferences(entry, outNames, seen);
            }
            continue;
        }

        collectTypeReferences(value, outNames, seen);
    }
}

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce feature ports to contain exported method-only interfaces and application-sourced custom method types.'
        },
        schema: []
    },
    create(context) {
        const filename = context.getFilename();
        const isFeaturePort = filename.includes('/src/features/') && filename.includes('/ports/');
        const isSharedPort = filename.includes('/src/shared/ports/');
        if (!isFeaturePort && !isSharedPort) {
            return {};
        }

        const importedTypeSourceByName = new Map();

        function report(node, message) {
            context.report({ node, message });
        }

        function getTypeParameterNames(typeParams) {
            if (!typeParams || !Array.isArray(typeParams.params)) {
                return new Set();
            }

            return new Set(
                typeParams.params
                    .filter((param) => param.type === 'TSTypeParameter' && param.name && param.name.type === 'Identifier')
                    .map((param) => param.name.name)
            );
        }

        return {
            ImportDeclaration(node) {
                const source = node.source && node.source.value;
                if (typeof source !== 'string') {
                    return;
                }

                for (const specifier of node.specifiers) {
                    if (
                        specifier.type === 'ImportSpecifier' ||
                        specifier.type === 'ImportDefaultSpecifier' ||
                        specifier.type === 'ImportNamespaceSpecifier'
                    ) {
                        importedTypeSourceByName.set(specifier.local.name, source);
                    }
                }
            },
            TSTypeAliasDeclaration(node) {
                report(node, 'Ports may not declare type aliases. Use exported interfaces only.');
            },
            ExportNamedDeclaration(node) {
                if (node.exportKind === 'type' && !node.declaration) {
                    report(node, 'Ports may not re-export types. Use exported interfaces only.');
                    return;
                }

                if (!node.declaration) {
                    return;
                }

                if (node.declaration.type !== 'TSInterfaceDeclaration') {
                    report(node.declaration, 'Ports may only export interfaces.');
                }
            },
            TSInterfaceDeclaration(node) {
                if (!node.parent || node.parent.type !== 'ExportNamedDeclaration') {
                    report(node, 'Port interfaces must be exported.');
                }

                const interfaceTypeParams = getTypeParameterNames(node.typeParameters);
                let methodCount = 0;

                for (const member of node.body.body) {
                    if (member.type !== 'TSMethodSignature') {
                        report(member, 'Port interfaces may only contain method signatures.');
                        continue;
                    }
                    methodCount++;

                    const methodTypeParams = getTypeParameterNames(member.typeParameters);
                    const allowedTypeParams = new Set([...interfaceTypeParams, ...methodTypeParams]);
                    const typeRefs = new Set();
                    const seen = new WeakSet();

                    for (const param of member.params) {
                        if (param.type === 'Identifier' && param.typeAnnotation) {
                            collectTypeReferences(param.typeAnnotation.typeAnnotation, typeRefs, seen);
                        }
                    }

                    if (member.returnType) {
                        collectTypeReferences(member.returnType.typeAnnotation, typeRefs, seen);
                    }

                    for (const typeName of typeRefs) {
                        if (BUILTIN_TYPES.has(typeName) || allowedTypeParams.has(typeName)) {
                            continue;
                        }

                        const source = importedTypeSourceByName.get(typeName);
                        if (!source) {
                            report(
                                member,
                                `Port method custom type '${typeName}' must be imported from this feature's application folder.`
                            );
                            continue;
                        }

                        if (!isApplicationImport(source)) {
                            report(
                                member,
                                `Port method custom type '${typeName}' must be imported from this feature's application folder.`
                            );
                        }
                    }
                }

                if (methodCount === 0) {
                    report(node, 'Port interfaces must declare at least one method signature.');
                }
            }
        };
    }
};
