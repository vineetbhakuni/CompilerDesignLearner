#include "ast.h"

#include <stdlib.h>
#include <string.h>

static char *dup_string(const char *src) {
    if (!src) {
        return NULL;
    }
    size_t len = strlen(src);
    char *copy = (char *)malloc(len + 1);
    if (!copy) {
        return NULL;
    }
    memcpy(copy, src, len + 1);
    return copy;
}

ASTNode *ast_create(const char *kind) {
    return ast_create_value(kind, NULL);
}

ASTNode *ast_create_value(const char *kind, const char *value) {
    ASTNode *node = (ASTNode *)calloc(1, sizeof(ASTNode));
    if (!node) {
        return NULL;
    }
    node->kind = dup_string(kind);
    node->value = dup_string(value);
    node->child_capacity = 4;
    node->children = (ASTNode **)calloc(node->child_capacity, sizeof(ASTNode *));
    return node;
}

void ast_add_child(ASTNode *parent, ASTNode *child) {
    if (!parent || !child) {
        return;
    }
    if (parent->child_count >= parent->child_capacity) {
        parent->child_capacity *= 2;
        parent->children = (ASTNode **)realloc(parent->children, parent->child_capacity * sizeof(ASTNode *));
    }
    parent->children[parent->child_count++] = child;
}

static void print_indent(int indent) {
    for (int i = 0; i < indent; i++) {
        putchar(' ');
    }
}

static void print_json_string(const char *s) {
    putchar('"');
    if (s) {
        for (const char *p = s; *p; p++) {
            if (*p == '"' || *p == '\\') {
                putchar('\\');
                putchar(*p);
            } else if (*p == '\n') {
                fputs("\\n", stdout);
            } else if (*p == '\t') {
                fputs("\\t", stdout);
            } else {
                putchar(*p);
            }
        }
    }
    putchar('"');
}

void ast_print_json(ASTNode *node, int indent) {
    if (!node) {
        fputs("null", stdout);
        return;
    }
    print_indent(indent);
    fputs("{\n", stdout);

    print_indent(indent + 2);
    fputs("\"kind\": ", stdout);
    print_json_string(node->kind);
    fputs(",\n", stdout);

    print_indent(indent + 2);
    fputs("\"value\": ", stdout);
    if (node->value) {
        print_json_string(node->value);
    } else {
        fputs("null", stdout);
    }
    fputs(",\n", stdout);

    print_indent(indent + 2);
    fputs("\"children\": [", stdout);
    if (node->child_count == 0) {
        fputs("]\n", stdout);
    } else {
        fputc('\n', stdout);
        for (int i = 0; i < node->child_count; i++) {
            ast_print_json(node->children[i], indent + 4);
            if (i < node->child_count - 1) {
                fputc(',', stdout);
            }
            fputc('\n', stdout);
        }
        print_indent(indent + 2);
        fputs("]\n", stdout);
    }

    print_indent(indent);
    fputc('}', stdout);
}

void ast_print_tree(ASTNode *node, int depth) {
    if (!node) {
        return;
    }
    for (int i = 0; i < depth; i++) {
        fputs("  ", stdout);
    }
    if (node->value) {
        printf("%s: %s\n", node->kind, node->value);
    } else {
        printf("%s\n", node->kind);
    }
    for (int i = 0; i < node->child_count; i++) {
        ast_print_tree(node->children[i], depth + 1);
    }
}

void ast_free(ASTNode *node) {
    if (!node) {
        return;
    }
    for (int i = 0; i < node->child_count; i++) {
        ast_free(node->children[i]);
    }
    free(node->children);
    free(node->kind);
    free(node->value);
    free(node);
}
