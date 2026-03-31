CC=gcc
FLEX=flex
BISON=bison
CFLAGS=-O2 -Wall -Wextra -std=c11

all: parser lexer_tokens

parser: parser.tab.c lexer.yy.c ast.c ast.h
	$(CC) $(CFLAGS) -o parser parser.tab.c lexer.yy.c ast.c -lfl

lexer_tokens: lexer_tokens.yy.c
	$(CC) $(CFLAGS) -o lexer_tokens lexer_tokens.yy.c -lfl

parser.tab.c parser.tab.h: parser.y ast.h
	$(BISON) -d -o parser.tab.c parser.y

lexer.yy.c: lexer.l parser.tab.h ast.h
	$(FLEX) -o lexer.yy.c lexer.l

lexer_tokens.yy.c: lexer_tokens.l
	$(FLEX) -o lexer_tokens.yy.c lexer_tokens.l

clean:
	rm -f parser lexer_tokens *.o *.tab.c *.tab.h lexer.yy.c lexer_tokens.yy.c
