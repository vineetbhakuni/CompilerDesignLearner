#ifndef AST_H
#define AST_H

#include <stdio.h>

typedef struct ASTNode {
    char *kind;
    char *value;
    struct ASTNode **children;
    int child_count;
    int child_capacity;
} ASTNode;

ASTNode *ast_create(const char *kind);
ASTNode *ast_create_value(const char *kind, const char *value);
void ast_add_child(ASTNode *parent, ASTNode *child);
void ast_print_json(ASTNode *node, int indent);
void ast_print_tree(ASTNode *node, int depth);
void ast_free(ASTNode *node);

#endif
