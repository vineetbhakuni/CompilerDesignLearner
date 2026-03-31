%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ast.h"

int yylex(void);
extern int yylineno;
extern FILE *yyin;

ASTNode *root = NULL;

void yyerror(const char *msg);

static ASTNode *make_binary(const char *op, ASTNode *left, ASTNode *right) {
    ASTNode *n = ast_create_value("BinaryExpr", op);
    ast_add_child(n, left);
    ast_add_child(n, right);
    return n;
}

static ASTNode *make_unary(const char *op, ASTNode *expr) {
    ASTNode *n = ast_create_value("UnaryExpr", op);
    ast_add_child(n, expr);
    return n;
}
%}

%union {
    ASTNode *node;
}

%token <node> IDENT INT_LIT FLOAT_LIT STRING_LIT BOOL_LIT
%token AGAR WARNA JABTAK DIKHAO RAKHO
%token AND OR NOT
%token EQ NEQ GTE LTE GT LT
%token TYPE_INT TYPE_FLOAT TYPE_STRING TYPE_BOOL
%token INVALID

%type <node> program stmt_list stmt decl type opt_init assign print_stmt if_stmt opt_else while_stmt block expr

%left OR
%left AND
%left EQ NEQ
%left GT LT GTE LTE
%left '+' '-'
%left '*' '/' '%'
%right NOT UMINUS

%%
program
    : stmt_list
      {
          root = ast_create("Program");
          ast_add_child(root, $1);
          $$ = root;
      }
    ;

stmt_list
    : stmt_list stmt
      {
          ast_add_child($1, $2);
          $$ = $1;
      }
    | /* empty */
      {
          $$ = ast_create("StmtList");
      }
    ;

stmt
    : decl ';'              { $$ = $1; }
    | assign ';'            { $$ = $1; }
    | print_stmt ';'        { $$ = $1; }
    | if_stmt               { $$ = $1; }
    | while_stmt            { $$ = $1; }
    | block                 { $$ = $1; }
    ;

decl
    : RAKHO type IDENT opt_init
      {
          ASTNode *n = ast_create("VarDecl");
          ast_add_child(n, $2);
          ast_add_child(n, $3);
          ast_add_child(n, $4);
          $$ = n;
      }
    ;

type
    : TYPE_INT              { $$ = ast_create_value("Type", "int"); }
    | TYPE_FLOAT            { $$ = ast_create_value("Type", "float"); }
    | TYPE_STRING           { $$ = ast_create_value("Type", "string"); }
    | TYPE_BOOL             { $$ = ast_create_value("Type", "bool"); }
    ;

opt_init
    : '=' expr              { $$ = $2; }
    | /* empty */           { $$ = ast_create("NoInit"); }
    ;

assign
    : IDENT '=' expr
      {
          ASTNode *n = ast_create("Assign");
          ast_add_child(n, $1);
          ast_add_child(n, $3);
          $$ = n;
      }
    ;

print_stmt
    : DIKHAO '(' expr ')'
      {
          ASTNode *n = ast_create("Print");
          ast_add_child(n, $3);
          $$ = n;
      }
    ;

if_stmt
    : AGAR '(' expr ')' stmt opt_else
      {
          ASTNode *n = ast_create("IfStmt");
          ast_add_child(n, $3);
          ast_add_child(n, $5);
          ast_add_child(n, $6);
          $$ = n;
      }
    ;

opt_else
    : WARNA stmt            { $$ = $2; }
    | /* empty */           { $$ = ast_create("NoElse"); }
    ;

while_stmt
    : JABTAK '(' expr ')' stmt
      {
          ASTNode *n = ast_create("WhileStmt");
          ast_add_child(n, $3);
          ast_add_child(n, $5);
          $$ = n;
      }
    ;

block
    : '{' stmt_list '}'
      {
          ASTNode *n = ast_create("Block");
          ast_add_child(n, $2);
          $$ = n;
      }
    ;

expr
    : expr '+' expr         { $$ = make_binary("+", $1, $3); }
    | expr '-' expr         { $$ = make_binary("-", $1, $3); }
    | expr '*' expr         { $$ = make_binary("*", $1, $3); }
    | expr '/' expr         { $$ = make_binary("/", $1, $3); }
    | expr '%' expr         { $$ = make_binary("%", $1, $3); }
    | expr GT expr          { $$ = make_binary(">", $1, $3); }
    | expr LT expr          { $$ = make_binary("<", $1, $3); }
    | expr GTE expr         { $$ = make_binary(">=", $1, $3); }
    | expr LTE expr         { $$ = make_binary("<=", $1, $3); }
    | expr EQ expr          { $$ = make_binary("==", $1, $3); }
    | expr NEQ expr         { $$ = make_binary("!=", $1, $3); }
    | expr AND expr         { $$ = make_binary("and", $1, $3); }
    | expr OR expr          { $$ = make_binary("or", $1, $3); }
    | NOT expr              { $$ = make_unary("not", $2); }
    | '-' expr %prec UMINUS { $$ = make_unary("neg", $2); }
    | '(' expr ')'          { $$ = $2; }
    | IDENT                 { $$ = $1; }
    | INT_LIT               { $$ = $1; }
    | FLOAT_LIT             { $$ = $1; }
    | STRING_LIT            { $$ = $1; }
    | BOOL_LIT              { $$ = $1; }
    ;

%%

void yyerror(const char *msg) {
    fprintf(stderr, "Syntax error at line %d: %s\n", yylineno, msg);
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: parser <source-file> [--json|--tree]\n");
        return 1;
    }

    const char *mode = "--json";
    if (argc >= 3) {
        mode = argv[2];
    }

    FILE *in = fopen(argv[1], "r");
    if (!in) {
        perror("fopen");
        return 1;
    }

    yyin = in;
    int result = yyparse();
    fclose(in);

    if (result != 0 || !root) {
        ast_free(root);
        return 1;
    }

    if (strcmp(mode, "--tree") == 0) {
        ast_print_tree(root, 0);
    } else {
        ast_print_json(root, 0);
        putchar('\n');
    }

    ast_free(root);
    return 0;
}
