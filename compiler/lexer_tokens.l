%option noyywrap yylineno nodefault

%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void print_token(const char *type, const char *lexeme) {
    printf("%d\t%s\t%s\n", yylineno, type, lexeme);
}
%}

%%
[ \t\r]+                             ;
\n                                   ;
"//"[^\n]*                           ;
"/*"([^*]|\*+[^*/])*\*+"/"          ;

"agar"                               { print_token("AGAR", yytext); }
"warna"                              { print_token("WARNA", yytext); }
"jabtak"                             { print_token("JABTAK", yytext); }
"dikhao"                             { print_token("DIKHAO", yytext); }
"rakho"                              { print_token("RAKHO", yytext); }
"and"|"aur"                          { print_token("AND", yytext); }
"or"|"ya"                            { print_token("OR", yytext); }
"not"|"nahi"                         { print_token("NOT", yytext); }
"int"                                { print_token("TYPE_INT", yytext); }
"float"                              { print_token("TYPE_FLOAT", yytext); }
"string"                             { print_token("TYPE_STRING", yytext); }
"bool"                               { print_token("TYPE_BOOL", yytext); }
"true"|"sahi"                        { print_token("BOOL_LIT", yytext); }
"false"|"galat"                      { print_token("BOOL_LIT", yytext); }

"=="                                 { print_token("EQ", yytext); }
"!="                                 { print_token("NEQ", yytext); }
">="                                 { print_token("GTE", yytext); }
"<="                                 { print_token("LTE", yytext); }
">"                                  { print_token("GT", yytext); }
"<"                                  { print_token("LT", yytext); }
"="                                  { print_token("ASSIGN", yytext); }
"+"                                  { print_token("PLUS", yytext); }
"-"                                  { print_token("MINUS", yytext); }
"*"                                  { print_token("MUL", yytext); }
"/"                                  { print_token("DIV", yytext); }
"%"                                  { print_token("MOD", yytext); }
"("                                  { print_token("LPAREN", yytext); }
")"                                  { print_token("RPAREN", yytext); }
"{"                                  { print_token("LBRACE", yytext); }
"}"                                  { print_token("RBRACE", yytext); }
";"                                  { print_token("SEMI", yytext); }
","                                  { print_token("COMMA", yytext); }

[0-9]+\.[0-9]+                        { print_token("FLOAT_LIT", yytext); }
[0-9]+                                { print_token("INT_LIT", yytext); }
"\\"([^\\\n]|(\\.))*\\""            { print_token("STRING_LIT", yytext); }
[a-zA-Z_][a-zA-Z0-9_]*                { print_token("IDENT", yytext); }

.                                     {
                                        fprintf(stderr, "Lexical error at line %d: unexpected character '%s'\n", yylineno, yytext);
                                        return 1;
                                      }
%%

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: lexer_tokens <source-file>\n");
        return 1;
    }

    FILE *in = fopen(argv[1], "r");
    if (!in) {
        perror("fopen");
        return 1;
    }

    yyin = in;
    int rc = yylex();
    fclose(in);
    return rc;
}
