%option noyywrap yylineno

%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "parser.tab.h"
#include "ast.h"
%}

%%
[ \t\r]+                             ;
\n                                   ;
"//"[^\n]*                           ;
"/*"([^*]|\*+[^*/])*\*+"/"          ;

"agar"                               { return AGAR; }
"warna"                              { return WARNA; }
"jabtak"                             { return JABTAK; }
"dikhao"                             { return DIKHAO; }
"rakho"                              { return RAKHO; }
"and"|"aur"                          { return AND; }
"or"|"ya"                            { return OR; }
"not"|"nahi"                         { return NOT; }
"int"                                { return TYPE_INT; }
"float"                              { return TYPE_FLOAT; }
"string"                             { return TYPE_STRING; }
"bool"                               { return TYPE_BOOL; }
"true"|"sahi"                        { yylval.node = ast_create_value("BoolLiteral", "true"); return BOOL_LIT; }
"false"|"galat"                      { yylval.node = ast_create_value("BoolLiteral", "false"); return BOOL_LIT; }

"=="                                 { return EQ; }
"!="                                 { return NEQ; }
">="                                 { return GTE; }
"<="                                 { return LTE; }
">"                                  { return GT; }
"<"                                  { return LT; }

[0-9]+\.[0-9]+                        { yylval.node = ast_create_value("FloatLiteral", yytext); return FLOAT_LIT; }
[0-9]+                                { yylval.node = ast_create_value("IntLiteral", yytext); return INT_LIT; }
"\\"([^\\\n]|(\\.))*\\""            {
                                         size_t len = strlen(yytext);
                                         char *unquoted = (char *)malloc(len - 1);
                                         if (!unquoted) {
                                             return INVALID;
                                         }
                                         memcpy(unquoted, yytext + 1, len - 2);
                                         unquoted[len - 2] = '\0';
                                         yylval.node = ast_create_value("StringLiteral", unquoted);
                                         free(unquoted);
                                         return STRING_LIT;
                                     }

[a-zA-Z_][a-zA-Z0-9_]*                { yylval.node = ast_create_value("Identifier", yytext); return IDENT; }

"="|"+"|"-"|"*"|"/"|"%"|"("|")"|"{"|"}"|";"|","  { return yytext[0]; }

.                                     {
                                        fprintf(stderr, "Lexical error at line %d: unexpected character '%s'\n", yylineno, yytext);
                                        return INVALID;
                                      }
%%
