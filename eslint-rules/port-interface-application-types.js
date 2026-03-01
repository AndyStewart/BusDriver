'use strict';

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce feature ports to contain exported interfaces only (no type aliases or type re-exports).'
        },
        schema: []
    },
    create(context) {
        const filename = context.getFilename();
        if (!filename.includes('/src/features/') || !filename.includes('/ports/')) {
            return {};
        }

        function report(node, message) {
            context.report({ node, message });
        }

        return {
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
            }
        };
    }
};
