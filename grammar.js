
const PREC = {
  COMMA: -1,
  ASSIGN: 0,
  COMMENT: 1,
};

// TODO - nick the heredoc stuff from tree-sitter-bash for multiline strings

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

const grammarObject = {
  name: 'terraform',

  /*
  externals: $ => [
    $._template_chars,
  ],
  */

  extras: $ => [
    $.comment,
    /[\s\uFEFF\u2060\u200B\u00A0]/,
  ],

  rules: {
    configuration: $ => repeat(choice(
      $.resource,
      $.data,
      // $.provider,
      $.variable,
      // $.output,
      $.locals,
      // $.module,
    )),

    variable: $ => seq(
      'variable',
      alias($.string_literal, $.variable_name),
      $.block,
    ),

    resource: $ => seq(
      'resource',
      alias($.string_literal, $.resource_type),
      alias($.string_literal, $.resource_name),
      $.block,
    ),

    data: $ => seq(
      'data',
      alias($.string_literal, $.data_type),
      alias($.string_literal, $.data_name),
      $.block,
    ),

    locals: $ => seq(
      'locals',
      $.block,
    ),

    attribute: $ => choice(
      prec.right(PREC.ASSIGN, seq($.identifier, $.initializer)),
      $.named_map,
    ),

    expression: $ => choice(
      $.boolean,
      $.number,
      // $.string_literal,
      $.interpolation_string,
      alias($.block, $.map),
      $.list,
    ),

    initializer: $ => seq(
      '=',
      $.expression,
    ),

    named_map: $ => seq(
      $.identifier,
      alias($.block, $.map),
    ),

    list: $ => seq(
      '[',
      commaSep($.string_literal),
      optional(','),
      ']',
    ),

    identifier: ($) => {
      const alpha = /[^\s0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()[\]{}\uFEFF\u2060\u200B\u00A0]/;
      const alphaNumeric = /[^\s:;`"'@#.,|^&<=>+\-*/\\%?!~()[\]{}\uFEFF\u2060\u200B\u00A0]/;

      return token(seq(alpha, repeat(alphaNumeric)));
    },

    comment: $ => token(prec(PREC.COMMENT, choice(
      seq('#', /.*/),
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    ))),


    block: $ => seq(
      '{',
      repeat($.attribute),
      '}',
    ),

    boolean: $ => choice('true', 'false'),

    number: ($) => {
      const decimalDigits = /\d+/;
      const hexLiteral = seq('0x', /[\da-fA-F]+/);

      const decimalIntegerLiteral = choice(
        '0',
        seq(optional('-'), optional('0'), /[1-9]/, optional(decimalDigits)),
      );

      const signedInteger = seq(
        optional(choice('-', '+')),
        decimalDigits,
      );

      const exponentPart = seq(choice('e', 'E'), signedInteger);

      const decimalLiteral = choice(
        seq(decimalIntegerLiteral, '.', optional(decimalDigits), optional(exponentPart)),
        seq('.', decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, optional(exponentPart)),
      );
      return token(choice(
        decimalLiteral,
        hexLiteral,
      ));
    },

    interpolation_string: $ => seq(
      '"',
      repeat(choice(
        $._template_chars,
        $.interpolation_substitution,
      )),
      '"',
    ),

    interpolation_substitution: $ => seq(
      '${',
      $._expressions,
      '}',
    ),

    _expressions: $ => choice(
      $._expression,
      $.sequence_expression,
    ),

    _expression: $ => /[^}]/,

    _template_chars: $ => token(choice(repeat1(choice(
      /[^\\"$]/,
      /\$[^{"$]/,
      /\\(.|\n)/,
    )))),

    sequence_expression: $ => prec(PREC.COMMA, seq(
      $._expression,
      ',',
      choice(
        $.sequence_expression,
        $._expression,
      ),
    )),

    string_literal: $ => token(seq('"', repeat(choice(/[^\\"\n]/, /\\(.|\n)/)), '"')),
  },

};

module.exports = grammar(grammarObject);
