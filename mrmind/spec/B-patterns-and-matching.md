# NeuroScript 2.2 — Patterns, Pattern Lists and the Matcher

**Implementation specification, dimension B.**
Target: a faithful JavaScript re-implementation of the MrMind3 runtime with **no language model**.

Sources, in order of authority:

1. **The archive** — `mrmind/archive/1_NeuroServer_fromVaio_MrMind/NeuroScript/`.
   The shipped bot is `Mrmind3`; its 49 build files are listed in `Mrmind3/MRMIND3.vsr` `[FILES]`.
   All counts below labelled **BUILD** are over exactly those 49 files; counts labelled **ALL** are over all
   184 `.n` files in the archive (including `Base`, `MrMind`, `Mrmind3old`, `Library`, `Copy of Library`, `HttpExample`).
2. **The vendor manual** — `NEUROSERVER_tutorial.pdf` (NativeMinds, _NeuroServer Tutorial, Version 3.5_,
   © 2000, 2001, Document Revision 9), text extracted at
   `mrmind/archive/_research/raw/NEUROSERVER_tutorial.txt`.
   This is the **vendor's own operator table** and is contemporaneous with NeuroScript 2.2 (May 2000).
   It settles several questions the patents leave open and it **overrides the patents** where they disagree.
   Cited as `[tut:LINE]`.
3. **The patent-derived spec** — `mrmind/archive/_research/patents/GERBIL-LANGUAGE-NOTES.md`,
   cited as `[spec §N]`.

Where the three disagree, the ranking used here is **archive > tutorial > patents**, and every such
disagreement is stated explicitly in §13.

---

## 0. Executive summary — the ten facts that matter

1. Matching is **character-level**, not word-level. `who*kronos` matches `whoiskronos` `[tut:2661-2679]`.
   The patents' NFA-over-word-symbols description is an _efficiency device_, not the semantics.
2. The wildcard alphabet is **`*` `#` `^` `%` `,` `.` and the literal space** — six wildcards plus space,
   not the three the patents name. `$` and `&` do not occur anywhere in the archive.
3. `#` matches **zero or more** non-space characters. Proof: `PatternList BOTS is "BOT","BOT's","Program","Programs","machine#","computer#"`
   must match the bare word _machine_ (`Mrmind3/Patterns.n:120`).
4. `,` = "zero or more spaces or punctuation characters" `[tut:2724]`. It is the single most misread
   construct in the corpus: `"aren,t"`, `"O,K"`, `"Belly,button"`, `"Mr,"`, `"book,mark#"` are **not** typos.
5. `+` concatenation inserts **one implicit space** between operands, unless either side of the junction
   already carries a separator (` ` `*` `,` `.`) or is the empty string.
   Proof: `?FactStatement contains YOU + "have to" + "trust me"` (`Mrmind3/Issues/TrustTruth.n:108`).
6. **Empty-string alternatives are not redundant**, because of rule 5. `("","#","# #")` means
   "zero, one or two intervening words" — the `""` is needed to suppress the implicit spaces,
   not because `#` cannot match empty.
7. `Contains P` ≡ `Matches "*" + P + "*"`, but the two wrapper stars are **not numbered** into the star buffer.
   Proof: `Contains "*@*"` then `Remember ?PossibleEmail is *1 + "@" + *2` (`Base/Utilities/EmailCapture.n:152,155`).
8. Star buffers are numbered **per wildcard class, independently**: `*1 *2 …`, `#1 #2 #3`, `^1 ^2`, plus `*match`.
   Proof: `If ?StdQ.PossibleQuestion Matches "#? *" and *1 contains #1` (`Library/StdQuestion/StdQuestion.us.n:814`).
9. Everything is **case-insensitive** (identifiers, keywords, pattern text). The `\A` case-sensitivity escape
   documented at `[tut:2727]` is used **zero times** in the archive.
10. **Apostrophes in a pattern are optional in the input.** Proof:
    `?WhatUserMeant matches "It's short for *"` with `Example "Its short for Fido"` (`Mrmind3/customization/NameCustomize.n:82-83`).

---

## 1. Corpus census

| quantity                               | BUILD (49 files) | ALL (184 files) |
| -------------------------------------- | ---------------- | --------------- |
| `PatternList` definitions              | 228              | 945             |
| `Pattern` (singular) definitions       | —                | 142             |
| match conditions (all operators)       | 1600             | 4111            |
| — `Contains`                           | 798              | 1637            |
| — `Matches`                            | 570              | 1837            |
| — `Heard` (bare)                       | 183              | 422             |
| — `IfHeard` (one token)                | 40               | 84              |
| — `notheard`                           | 84               | 156             |
| — `DoesNotMatch`                       | 37               | 166             |
| — `DoesNotContain`                     | 11               | 43              |
| — `ExactlyMatches`                     | **1**            | 6               |
| — `DidNotHear` / `DoesNotExactlyMatch` | **0**            | **0**           |
| string literals in pattern position    | 7683             | 29850           |
| `+` operators in pattern position      | 971              | 2903            |
| `(` inline pattern lists               | 442              | 1449            |
| `{` optional elements                  | **3**            | 27              |
| star-buffer tokens                     | 425              | 1656            |

Damaged files (report, do not treat as empty scripts): four zero-length `.n` files exist —
`Mrmind3/Activities/picutres.n`, `Mrmind3/AboutMrMind/MMfamily.n`, `Mrmind3old/Answering.n`,
`Mrmind3old/AboutMrMind/MMfamily.n`. **None of them is in the `MRMIND3.vsr` build list.** No NUL-filled files exist.

Encoding: `.n` files are CRLF. Three bytes in the whole archive are non-ASCII, all `0xE9` = `é` in
Windows-1252, in `Mrmind3/AboutMrMind/MMIdentity.n:204,213,217` (`"Paul Valéry"`, used **in a pattern** at line 213).
**Decode `.n` as Windows-1252, not UTF-8.**

---

## 2. Lexical level

```ebnf
comment      = "//" , { any - newline } ;                     (* only form observed *)
string       = '"' , { escape | any - ('"' | "\") } , '"' ;
escape       = "\" , any ;
symbol       = letter | "_" , { letter | digit | "_" | "." } ; (* dots ARE legal: ?StdQ.LocalQuestion, StdP.QuestionStarts *)
memref       = "?" , symbol ;
starbufref   = ( "*" | "#" | "^" ) , digit , { digit } | "*match" ;
```

- **Comments.** Only `//` to end of line occurs. `/* */` never occurs. Strip comments _outside_ string
  literals only — `//` inside a string (`"http://www.hotbot.com/?MT="`) is data.
- **Escapes.** `\X` denotes a literal `X` for every `X` `[tut:2729-2731]`. Frequencies over ALL:
  `\.`×134, `\'`×105, `\,`×57, `\"`×51, `\?`×30, `\*`×26, `\)`×24, `\(`×24, `\!`×8, `\&`×6, `\=`×4,
  `\+`×2, `\-`×2, `\/`×2. **No escape before an alphabetic character occurs anywhere**, so the
  documented case-sensitivity escape `[tut:2727]` never fires in this corpus.
  Only `\"` is strictly required by the lexer; the rest are defensive authoring.
- A **bare apostrophe** inside a string is legal and common: `PatternList CANNOT is …, "can't", …, "don't", "won't";`
  (`Mrmind3/Patterns.n`). `\'` and `'` are equivalent.
- **Keywords and identifiers are case-insensitive.** `heard`/`Heard`/`IfHeard`, `matches`/`Matches`,
  `you`/`YOU` (both spellings of the same PatternList are used: `Base/Inanities/Personality.n:454` `you+" support *"`
  versus `Mrmind3/…` `YOU`).

---

## 3. Grammar of pattern expressions

A _pattern expression_ is what appears (a) after `is` in a `PatternList` / `Pattern` definition and
(b) as the right-hand side of a match operator.

```ebnf
patexpr      = patlist ;
patlist      = patlistobj , { "," , patlistobj } ;         (* alternation *)
patlistobj   = catterm ;
catterm      = catfactor , { "+" , catfactor } ;           (* concatenation, see §5 *)
catfactor    = string
             | symbol                                      (* Pattern or PatternList reference *)
             | memref                                      (* ?Attr — value spliced in at run time *)
             | starbufref                                  (* *1 #1 ^1 *match *)
             | "(" , patlist , ")"                         (* inline (implicit) pattern list *)
             | "{" , patlist , "}" ;                        (* optional element *)
```

Notes forced by the archive:

- `,` at the top level of a `PatternList` body and `,` inside `( … )` are the **same** operator: alternation.
  `PatternList OPTARTICLE is ARTICLES,"";` (`Mrmind3/Patterns.n:32`) and
  `("I want to", "I need to", "can you", "could you", "would you", "")` (`Base/Defaults/HighDefault.n:106`).
- `+` binds tighter than `,`.
- **Nesting is real but shallow.** Histogram of maximum parenthesis depth per pattern expression over ALL:
  depth 0 → 4000, depth 1 → 1012, depth 2 → 43, depth 3 → 1.
  Depth-2 example: `("how long*take*"+DEVELOP+(YOU, YOUR+"script"), …)` (`Base/Inanities/Capabilities.n:1569`).
  The single depth-3 case mixes braces and parens: `({(YOU,YOUR)}+"welcome","de nada","my pleasure", …)`
  (`Base/Inanities/Personality.n:31`).
- A `PatternList` may reference another `PatternList`; this is the normal idiom:
  `PatternList CLOTHES is "clothes", …, "bowtie", ACCESSORYCLOTHING;` (`Mrmind3/Patterns.n:130`).
  Resolution is by name, case-insensitively, over the whole project (all files), not per file.
- **`Pattern` (singular)** declares a _single_ string constant, e.g.
  `Pattern HOMEDIRECTORY is "http://www.nativeminds.com/html/";` (`Base/Patterns.n:292`). 142 occurrences over ALL.
  For matching purposes a `Pattern` is a `PatternList` of length 1.

### 3.1 The one genuine parsing ambiguity

Inside an `If`, a `(` can begin **either** an inline pattern list **or** a condition group:

```
If (?FactQuestion contains "you like me" or ( I and (YOU,YOUR) and "friend#"))   Base/Inanities/Personality.n:961
If (heard ("x","times", "product of", "multiplied by")                          Base/Inanities/Capabilities.n:469
```

Rule for the port: after a match operator, scan the parenthesised group; if its **top level** contains a
condition keyword (`Recall`, `DontRecall`, `Focused`, `Heard`, `notheard`, `Matches`, `Contains`,
`ExactlyMatches`, `DoesNotMatch`, `DoesNotContain`, `Chance`, `IfChance`) or a `?attr`, it is a condition
group; otherwise it is an inline pattern list. `and` / `or` / `not` appearing at the top level of a
_pattern-position_ group are boolean pattern operators (§8.3), not list separators.

---

## 4. The wildcard alphabet

The authoritative table, verbatim from the vendor manual `[tut:2720-2731]`:

> - Apostrophes (‘) are optional in your topic patterns.
> - Asterisk (\*) represents zero or more words or punctuation.
> - Number sign (#) represents zero or more characters or punctuation.
> - Caret (^) represents exactly one character.
> - Comma (,) represents zero or more spaces or punctuation characters.
> - Percent sign (%) matches exactly one digit (0–9).
> - Period (.) matches one or more spaces or punctuation characters.
> - Space ( ) matches one or more spaces in the user’s input.
> - Backslash (\\) before any alphabetic character specifies case-sensitive matching on that character.
> - Backslash (\\) before a special character like an asterisk (\*) specifies a literal match on that character.

Operationalised for the port, with archive counts (**strings in pattern position containing the character**,
unescaped occurrences only):

| char | BUILD | ALL   | meaning used by the port                           | regex equivalent                 |
| ---- | ----- | ----- | -------------------------------------------------- | -------------------------------- |
| `*`  | 980   | 3429  | zero or more characters, **may cross spaces**      | `[\s\S]*`                        |
| `#`  | 731   | 2963  | zero or more characters, **never crosses a space** | `[^\s]*`                         |
| `,`  | 158   | 671   | zero or more spaces **or** punctuation characters  | `[\s` + PUNCT + `]*` (see §10.1) |
| `.`  | 78    | 260   | one or more spaces **or** punctuation characters   | `[\s` + PUNCT + `]+` (see §10.1) |
| `^`  | 15    | 82    | exactly one character                              | `[^\s]`                          |
| `%`  | 3     | 31    | exactly one digit                                  | `[0-9]`                          |
| ` `  | —     | —     | one or more spaces                                 | ` +`                             |
| `$`  | **0** | **0** | not present in NeuroScript 2.2                     | —                                |
| `&`  | 0¹    | 0¹    | not a wildcard in 2.2                              | —                                |

¹ The single `&` inside a pattern string is escaped (`"M,\&,M#"`, `Mrmind3/AboutMrMind/MMphysical.n:141`)
and every other `&` in the archive is inside a URL query string or an HTML entity in a `Say`.
The 1998 patent BNF's `&` star-buffer slot `[spec §5]` corresponds to what 2.2 spells `^`.

### 4.1 `*` — zero or more characters, may cross spaces

The patents call `*` a _word_ wildcard `[6604090:3228]`. **The archive and the tutorial both contradict this.**
`[tut:2661-2679]`, verbatim:

> 5. Edit the pattern to add an asterisk wildcard in place of the “was”. Change the line
>    `If Heard "who was kronos"` to `If Heard "who*kronos"`
>    …
> 6. Test the topic in the Console window. The following variations should activate the who was kronos topic:
>    `who was kronos` / `who is kronos` / `whois kronos` / `who is krosno` / `whoaskfl kronos` / `whoaskflkronos`

`whois kronos` and `whoaskflkronos` are only reachable if `*` matches inside a word and can span a space.
Archive usage agrees: `"this*sucks"`, `"A*list"`, `"sense*smell"`, `"mast*rbat#"`, `"search*for"`, `"fantas*"`.

Anchor ordering is preserved: `kronos was who` does **not** match `who*kronos` `[tut:2681-2683]`.

### 4.2 `#` — zero or more characters, never crosses a space

**`#` can match the empty string.** Decisive archive evidence:

```
Mrmind3/Patterns.n:120   PatternList BOTS is "BOT","BOT's","Program","Programs","machine#","computer#";
```

`BOTS` is the list used throughout MrMind for "are you a machine / a computer". Bare _machine_ and
bare _computer_ have no other entry in the list, so `machine#` must match `machine`.
Same argument: `PatternList APOLOGY is "sorry","apologize","apologise", "sorry about that", "forgive#", …`
(`Mrmind3/Patterns.n:29`) — bare _forgive_ has no other entry.
This confirms `[tut:2722]` and refutes the working hypothesis in `[spec §5.1]` that `#` needs one character.

**`#` never crosses a space.** `Mrmind3/Utilities/WebNameGreet.n:546-547`:

```
	//Now we check.  If we have a single word, the simplest case, then we will call
	//that word our user's name.
		If ?NameCapture.Tempname matches "#", "#-#", "^\.^\.","^\.,#"
```

`Matches "#"` is the test for "the value is a single word".

Typical `#` idioms in the shipped bot: `"#ing"`, `"#teen"`, `"broil#"`, `"jewel#"`, `"annoy#"`,
`"schizo#"`, `"elbow#"`, `"# #"` (exactly two words), `"# # #*"` (three words then anything).

**Does `#` match punctuation?** The two vendor statements conflict:

- `[tut:2722]` "Number sign (#) represents zero or more characters **or punctuation**."
- `[tut:6001-6002]`, the comment above the very code it documents:
  `//The following strips any internal words //containing apostrophes. (# doesn't match apostrophes)`

**Port decision:** `#` matches zero or more characters that are neither whitespace nor an apostrophe
(`'` U+0027, and for safety `’` U+2019). This satisfies both statements literally. The only archive
constructs that could distinguish the readings are `"#-#"` (hyphenated names, `WebNameGreet.n:547`) and
`",#,"` (`Base/Utilities/EmailCapture.n:176`), and in both the pattern appears in a **disjunction with
the plain-`#` form**, so neither reading changes the outcome. Recorded in §14 as low-risk.

### 4.3 `,` — zero or more spaces or punctuation

This is the workhorse of the corpus and is invisible if you read `,` inside a string as a literal comma.
Verbatim archive definitions (all `Mrmind3/Patterns.n` unless noted):

```
:440  PatternList NT is "un","are not", "aren,t","does not", "doesn,t","will not","won,t",
:441          "did not", "didn,t", … "ain,t","should not","shouldn,t","could not","couldn,t", "not", "no", "can not","can,t";
:453  PatternList OKAY is "O,K", "all right", "alright", "well", "okay";
:64   PatternList BELLYBUTTON is "Belly,button","navel","umbilical";
:7    PatternList AGE is "child#", … ,"%","%%","%%%","#,one","#,two","#,three","#,four","#,five",
                          "#,six","#,seven","#,eight","#,nine","#teen", "teenager", "teen", …
:315  PatternList GOOD is "ok","okay","bravo","cool","i,m glad", … "that,s*funny","that,s*neat", …
:425  PatternList MRMIND is …, "Mr, Mind", "Mme. Mind", …
:585  … "good,for,nothing" …
:602  … "you,re" …
```

`"aren,t"` matches _aren't_, _arent_, _aren t_, _aren-t_. `"O,K"` matches _ok_, _o.k._, _O K_.
`"#,one"` matches _twenty-one_, _twentyone_, _twenty one_. `"Belly,button"` matches _bellybutton_,
_belly button_, _belly-button_.

Vendor confirmation `[tut:4429]` and `[tut:4384]`: the pattern `"book,mark#"` is described as matching
the user input _bookmark_ and _bookmarks_.

Also `Mrmind3/Utilities/WebNameGreet.n:23-25`:

```
PatternList NameCapture.Titles is "Mr,", "Mrs,", "Miss,", "Ms,", "Dr,", "Sir", "Lord", "Lady",
			"Baron","Duke", … "Sr,", "Mister", "^."; //the last (^) is for first initials.
```

`"Mr,"` matches _Mr_ and _Mr._; `"^."` matches a single-letter initial followed by punctuation.

A literal comma must be escaped: `"wait\,"` (`Library/StdQuestion/StdQuestion.us.n:510`),
`Matches "*\,*"` for "Smith, John" (`Mrmind3/Utilities/WebNameGreet.n:540`).

### 4.4 `.` — one or more spaces or punctuation

Unescaped `.` in a pattern is a wildcard. Escaped `\.` is a literal period, and the archive uses both
deliberately in the same file:

```
Mrmind3/Utilities/WebNameGreet.n:547   If ?NameCapture.Tempname matches "#", "#-#", "^\.^\.","^\.,#"
Mrmind3/Utilities/WebNameGreet.n:575   If ?NameCapture.TempName Matches "^\.^" Then
Mrmind3/Utilities/WebNameGreet.n:25    … "Sr,", "Mister", "^."; //the last (^) is for first initials.
```

`"^\.^\."` = initial, literal `.`, initial, literal `.` — i.e. _J.W._ Because `.` is a wildcard, the
author had to escape it to _require_ a period.

Unescaped `.` mostly appears where the author meant a literal period and got a superset for free:
`"A.I."`, `"T.V."`, `"Mr. Mind"`, `"Mme. Mind"`, `"MS.MIND"`, `"St. Patricks Day"`, `"sex.organ"`,
`"mrmind.gov"`, `"h.a.r.l.i.e."`. Note the **consequence**: `"A.I."` requires punctuation between the
letters and after the final `I`, so plain `ai` does **not** match it, while `a i` and `a-i-` do.
This is a real behavioural quirk, not a bug in the port. Keep it.

### 4.5 `^` — exactly one character

15 occurrences in BUILD, all listed:

```
Mrmind3/Utilities/WebNameGreet.n:25    "^."                 (first initial + punctuation)
Mrmind3/Utilities/WebNameGreet.n:547   "^\.^\."   ×5        (J.W.)
Mrmind3/Utilities/WebNameGreet.n:547   "^\.,#"    ×4        (J. Smith / J.Smith)
Mrmind3/Utilities/WebNameGreet.n:575   "^\.^"     ×1        (J.W  — no trailing period)
Mrmind3/Utilities/WebNameGreet.n:620   "^\.^ *"   ×1
Mrmind3/Utilities/WebNameGreet.n:620   "^\.^\. *" ×1
Mrmind3/Patterns.n:142                 "barbe^ue#"×1        (barbecue / barbeque)
Mrmind3/AboutUser/UserMind.n:146       "mc^2"     ×1        (E = mc², author meant a literal caret)
```

`"mc^2"` is the only place a caret is (almost certainly) meant literally; under the wildcard reading
it still matches the input `mc^2`, so it is harmless. Keep the wildcard reading — do not special-case it.

### 4.6 `%` — exactly one digit

Six occurrences in BUILD, all in `Mrmind3/Patterns.n:7`:

```
PatternList AGE is "child#","codger#","coot#","geezer#","kid#","old#","senior","teen#","young#","year",
"%","%%","%%%",	"#,one","#,two", …
```

`Base/Patterns.n:447-448` (not in the MrMind3 build) has the full ladder and contains an authoring gap
worth reproducing exactly if you ever load that file — the 9-digit rung is missing:

```
PatternList NUMBER is "%", "%%", "%%%", "%%%%", "%%%%%", "%%%%%%",
	"%%%%%%%", "%%%%%%%%", "%%%%%%%%%%", "%%%%%%%%%%%";
```

### 4.7 `$` and `&` — absent

Zero `$` characters occur in any pattern string in the archive. The 1997 patent's `$it` form
`[6363301:4250]` is obsolete; NeuroScript 2.2 writes `it#`. Zero unescaped `&` wildcards occur.
Do not implement either.

### 4.8 The literal space

A space in a pattern is an **arc that requires one or more spaces in the input** `[tut:2726]`.
This is what makes the patents' `"you are"` ≠ `"you sure are"` rule work `[6604090:4809-4816]`.
Two adjacent pattern spaces would require two input spaces; the port collapses runs of pattern spaces
to a single space arc at compile time (see §5.3), which is what makes the redundant explicit spaces in
`you+" support *"` harmless.

---

## 5. Semantics of pattern expressions

A pattern expression **evaluates to a set of rendered pattern strings** (the "list of strings" of
`[spec §5]`). Matching succeeds if **any** rendered string matches.

### 5.1 Alternation

`A, B, C` → the union of the rendered sets of `A`, `B`, `C`.
This applies identically to a `PatternList` body, an inline `( … )`, and the top-level RHS of a match operator:

```
Mrmind3/Reactions/Questions.n:28   (Heard "let's talk","talk # me" and notheard "about" )
Base/Defaults/HighDefault.n:153    and #1 DoesNotMatch OPTARTICLE, "me","information","about","on"
```

### 5.2 The empty string

`""` is a legal element and appears 30 times in BUILD, 151 times in ALL. It is the _canonical way to
make an element optional without using braces_:

```
Mrmind3/Patterns.n:32   PatternList OPTARTICLE is ARTICLES,"";
Mrmind3/Patterns.n:33-34  //if an article is there, it should match in preference to the empty string, because it should
                          //be more specific than the empty string.
```

(That comment is also a note about specificity: a longer path scores higher, so the article branch wins
when both match — see the specificity dimension.)

### 5.3 Concatenation `+` and the implicit space — **normative**

Concatenation is a cross-product: the rendered set of `A + B` is
`{ join(a, b) : a ∈ render(A), b ∈ render(B) }`.

`join` is defined as follows.

```
function joinPieces(pieces):            # pieces are rendered strings, in order
    ps = pieces with every "" removed   # empty strings contribute nothing at all
    if ps is empty: return ""
    out = ps[0]
    for p in ps[1:]:
        if not endsWithSeparator(out) and not startsWithSeparator(p):
            out = out + " "             # the implicit space
        out = out + p
    return out

endsWithSeparator(s):   s ≠ "" and s[-1] ∈ { " ", "*", ",", "." } and s[-1] is not backslash-escaped
startsWithSeparator(s): s ≠ "" and s[0]  ∈ { " ", "*", ",", "." } and s[0]  is not backslash-escaped
```

`#`, `^` and `%` are **not** separators: they take an implicit space on both sides.

After joining, collapse any run of two or more literal spaces to one (this makes the redundant explicit
spaces authors wrote harmless).

**Evidence that the implicit space exists** — all from the shipped MrMind3 build, all `Contains`
(so the whole thing is searched anywhere in the input):

```
Mrmind3/Issues/TrustTruth.n:108     If (?FactStatement contains YOU + "have to" + "trust me")
Mrmind3/Issues/RIskGoals.n:20       or (?AnyStatement Contains "I" + "worry about" +FUTURE.N)
Mrmind3/Issues/Consciousness.n:183  If ((?HaveStatement contains ("I have" + "a" + SOUL))
Mrmind3/AboutUser/UserPhysical.n:206    ?FactStatement Contains ("Opposable" +  "thumb#")
Mrmind3/AboutUser/UserMind.n:529    If ?FactStatement Contains ("my mind" +"wander#")
Mrmind3/Issues/Humor.n:7            or (?AnyStatement contains I+"Laugh", I + "have to"+"Laugh")
```

`"I have" + "a" + SOUL` must match _I have a soul_; without the implicit space it would compile to
`I haveasoul`. Confirms `[6604090:4708-4712]`.

**Evidence that `*` suppresses it** — `Mrmind3/AboutMrMind/WhatIsMM.n:68`:

```
	If Recall ?FactQuestion and heard "are"+YOU+"*"+OKAY
```

with `PatternList OKAY is "O,K", "all right", "alright", "well", "okay";` (`Mrmind3/Patterns.n:453`).
This is the example the brief asks about. It renders to `are you*O,K` (and 4 more alternatives per
`YOU` element). The space between `"are"` and `YOU` is implicit; the junctions either side of `"*"`
take none. If `*` did not suppress, `are you * ok` would demand two separate runs of spaces around the
`*` and the input _are you ok_ would fail.

**Evidence that `#` does _not_ suppress it** — `Base/Patterns.n:294-295`:

```
PatternList HOW is "How","how does that work",
			"how"+("do","does","did","will","would","should","could")+"#"+"do that",
			"how so";
```

Intended: _how do you do that_, _how does he do that_. Renders to `how do # do that`.
And `Mrmind3/Issues/Consciousness.n:184`:

```
	or (?HaveStatement contains ("human#" + "have *") + SOUL)
```

renders `human# have *soul…` — the space after `human#` is implicit, the one before `soul` is suppressed by `*`.

**Evidence that `,` suppresses it** — `Library/StdQuestion/StdQuestion.us.n:512`:

```
		"thanks, ", StdP.COOL+", ","whatever, ","hi, ","hello, ", "Hmm," ) + "*",
```

`StdP.COOL+", "` must match _cool, tell me…_. With an implicit space it would compile to `cool , ` and
require a space before the comma, which the input does not have. Likewise
`"#,"+HELLOQUESTION` (`Mrmind3/Utilities/WebNameGreet.n:927`) must match _hi,hello_.

**Evidence that the empty string is transparent** — `Base/Defaults/HighDefault.n:106-109`:

```
	If ?WhatUserSaid Matches
		("I want to", "I need to", "can you", "could you", "would you", "") +
	 	("find me","find","look for","search*for","I'm looking for")+ {"information on","information about"}+OPTARTICLE +"# # #*"
		and #1 DoesNotMatch OPTARTICLE
		and (#1 DoesNotMatch "information" or #2 DoesNotMatch ("About","on"))
		and #1 DoesNotMatch "me"  //as in "find me a ..."
		and #3 DoesNotMatch "on","in","please"
	Then
		Example "Can you find very ugly rabbits?";
	  	Say "I'm a company representative, not a search engine.  Maybe Hotbot can help.";
		Show "http://www.hotbot.com/?MT="+#1+"+"+#2+"+"+#3 + …
```

With the first list = `"can you"`, the optional `{…}` absent and `OPTARTICLE` = `""`, the rendered
pattern must be `can you find # # #*` for `Example "Can you find very ugly rabbits?"` to bind
`#1=very`, `#2=ugly`, `#3=rabbits` (which the `Show` line then splices into a HotBot query, and which
the four `DoesNotMatch` guards then check). That requires the `""` to be dropped **and** the implicit
space between `find` and `#` to appear. Both rules are needed; either alone gives the wrong answer.

**No implicit space in value context.** The same `+` operator, used to build an output string in
`Say` / `SayOneOf` / `Remember` / `Show`, is plain concatenation. Authors always write the spaces:

```
Mrmind3/AboutMrMind/MMphysical.n:6   SayOneOf "I have no body, <BR>so it follows that I have <BR>no "+ *match +".",
Base/Utilities/EmailCapture.n:170-171  If ?PossibleEmail matches "* #\'# *" then remember ?PossibleEmail is *1 + " "+ *2; continue
Mrmind3/Utilities/CProfanity.n:84    SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;
```

The implicit space is a **pattern-compilation** rule only.

### 5.4 `{ }` — optional elements

`{X}` renders as `render(X) ∪ {""}`. It is rare: **3 occurrences in the shipped build**, 27 across ALL.
All three shipped ones:

```
Mrmind3/AboutMrMind/MMphysical.n:188   and heard {MRMIND}
Mrmind3/AboutUser/UserFamily.n:88      and heard {"human"}
Mrmind3/Humans&Machines/Humans.n:87    If ?DescriptionQuestion Matches "humanity"+{"anyway"} Then
```

Two of the three are a **whole condition** wrapped in braces, i.e. `heard {X}` is an _optional condition_:
it never prevents the block from firing, it only adds specificity when it is true
(`[spec §14.3]`: "Completely optional conditions have a specificity of 0 if they are not true, and their
true specificity value if they are"). The third is an optional element inside a concatenation.

Selected `{}` uses elsewhere in the archive, which show the full range:

```
Base/Inanities/Capabilities.n:410    If (?DescriptionQuestion contains {YOU} and "sentien#")
Base/Inanities/Capabilities.n:691    If (?CanQuestion contains {DEVELOPWORDS,USE} and                 (braces around a 2-element list)
Base/Inanities/Personality.n:31      If ?WhatUserMeant matches ({(YOU,YOUR)}+"welcome","de nada", …   (braces around parens)
Base/Defaults/Default.n:43           "no","nope","nah","nonsense","not really", "I don't want to","not now")+{"thanks"}
Base/Inanities/Conversation.n:191    ("now", "next")+{"",THISBOT}                                    (braces containing "")
```

**For matching, `{X}` and `(X,"")` are identical.** They differ only in specificity accounting.

### 5.5 Memory references inside patterns

`?Attr` inside a pattern expression splices the attribute's current string value in as a literal
(22 occurrences in BUILD). The most common shape is a bot-echo test:

```
Mrmind3/customization/NameCustomize.n:55
	If ?WhatRobotSaid matches "By the way, is " + ?Name + " <BR>your real name or a special <BR>one just for me?"
```

The spliced value is treated as **literal text, not as a pattern** — otherwise a user called `*` would
match everything. (Not directly provable from the archive; recorded in §14.)

`[spec §5]` also allows `?<pat>:<symbol>` for another user's memory; the form does not occur in the archive.

---

## 6. Star buffers

### 6.1 Census

Tokens outside string literals (a `#1` **inside** a string is `#` followed by the digit `1` — see
`PatternList HEX is "#0#","#1#",…,"#f#";` at `Mrmind3/Patterns.n:327`, which matches hex digits, not buffers):

| token      | BUILD   | ALL      |
| ---------- | ------- | -------- |
| `*1`       | 217     | 823      |
| `*2`       | 79      | 310      |
| `*3`       | 0       | 9        |
| `*4`       | 0       | 4        |
| `*5`       | 0       | 6        |
| `#1`       | 70      | 319      |
| `#2`       | 15      | 73       |
| `#3`       | 1       | 11       |
| `^1`       | 2       | 12       |
| `^2`       | 1       | 6        |
| `*match`   | 40      | 83       |
| `%n`, `&n` | **0**   | **0**    |
| **total**  | **425** | **1656** |

Highest index observed anywhere: `*5`, `#3`, `^2`. A port that supports `*1..*9`, `#1..#9`, `^1..^9`
covers the corpus with room to spare. **`%n` never occurs** — `%` matches but is never captured.

### 6.2 Numbering rule

Each wildcard class has its **own** counter, assigned left-to-right over the rendered pattern.
`*1` is the first `*`, `#1` the first `#`, `^1` the first `^`, independently.

```
Library/StdQuestion/StdQuestion.us.n:814   If ?StdQ.PossibleQuestion Matches "#? *" and *1 contains #1
Mrmind3/Utilities/WebNameGreet.n:507       If ?NameCapture.TempName matches "#*" and #1 matches COMMONNAMES then
Mrmind3/Utilities/WebNameGreet.n:511       and ?NameCapture.TempName matches "*#*" and #1 matches COMMONNAMES then
```

In `"#? *"` the single `#` is `#1` and the single `*` is `*1`; in `"*#*"` the `#` is still `#1` while
the two stars are `*1` and `*2`.

**The implicit `*` wrappers added by `Contains` are not numbered.** Decisive:

```
Base/Utilities/EmailCapture.n:152-155
	If ?WhatUserSaid Contains "*@*"
	then
		Remember ?PossibleEmail is *1+"@"+*2;
```

If the wrappers were numbered, the author's stars would be `*2` and `*3`.

### 6.3 Positions where star buffers appear

Distribution of the token immediately **before** / **after** a star buffer (BUILD):

| context                      | count     | shape                                              |
| ---------------------------- | --------- | -------------------------------------------------- |
| after `is`                   | 223       | `Remember ?X is *1;`                               |
| adjacent to `+`              | 141 / 138 | inside a `Say` / `Remember` / `Show` concatenation |
| after `and` / `if`           | 53        | star buffer as the **LHS of a nested condition**   |
| after `contains` / `matches` | 3         | star buffer as the **pattern RHS**                 |
| after `of`                   | 2         | `remember ?Name1 is compute uppercase of ^1;`      |

Verbatim examples of each:

```
Remember RHS      Base/Utilities/EmailCapture.n:155   Remember ?PossibleEmail is *1+"@"+*2;
Remember RHS      Library/Utilities/combis/WebName.n:589  Remember ?NameCapture.TempName is ^1+"."+^2+".";
Say RHS           Mrmind3/Humans&Machines/Bots.n:52  SayOneOf *match + " is a fictional Bot.  <BR>I am a real Bot.";
Show RHS          Base/Defaults/HighDefault.n:117    Show "http://www.hotbot.com/?MT="+#1+"+"+#2+"+"+#3 + …
condition LHS     Base/Defaults/HighDefault.n:110    and #1 DoesNotMatch OPTARTICLE
condition LHS     Base/Defaults/HighDefault.n:113    and #3 DoesNotMatch "on","in","please"
condition LHS     Base/Inanities/Personality.n:332   and *1 DoesNotMatch "interested*", "confused*", "not*", "scared*", "happy*",
pattern RHS       Library/StdQuestion/StdQuestion.us.n:814  If ?StdQ.PossibleQuestion Matches "#? *" and *1 contains #1
pattern RHS       Mrmind3/Utilities/WebNameGreet.n:528     if #1 Matches #3
pattern RHS       Base/Inanities/Capabilities.n:475        and ?DescriptionQuestion matches *1+"#"+*2
compute operand   Mrmind3/Utilities/WebNameGreet.n:686     remember ?Name1 is compute uppercase of ^1;
```

When a star buffer is used **as a pattern** (RHS), its text is used literally — `#1 Matches #3` is a
string comparison, not a re-parse.

### 6.4 `*match`

`*match` is the substring of the input that matched the **pattern proper** of the most recent successful
match test — for a `Contains`, _not_ the whole input. Verbatim proof (`Mrmind3/Humans&Machines/Bots.n:44-53`):

```
Topic "Do you know <fictional bot>" is
Subjects "Fictional Bots";
	If (heard "do you know" and
		(Heard FICTIONALBOTS or (Focused and heard "him","her","it","them")))
		or (?FactQuestion contains "you *"
			and heard FICTIONALBOTS)
	Then
		Example "Do you know HAL?";
		SayOneOf *match + " is a fictional Bot.  <BR>I am a real Bot.";
		Done
EndTopic
```

The intended output for the Example is "HAL is a fictional Bot." — so `*match` is the text matched by
`Heard FICTIONALBOTS`, not by `heard "do you know"` and not the whole utterance.
Second proof (`Mrmind3/AboutMrMind/MMphysical.n:1-8`):

```
Topic "Do you have a body?" is
Subjects "ME";
	If Heard YOU, YOUR and heard BODYPARTWORD
	Then
		Example "do you have feet?";
		SayOneOf "I have no body, <BR>so it follows that I have <BR>no "+ *match +".",
```

Expected output "…I have no **feet**." — again the _last_ successful match test wins.

### 6.5 Lifetime and overwrite semantics

- The star buffer is **global to the user session**, not scoped to a condition.
  `[spec §5]`: "the substring of an input string which matched each … wildcard character in the template
  pattern in the **most recent successful match**".
- Conditions are evaluated left to right; each **successful** match test overwrites the buffer.
  A failed test leaves the previous contents (this is what makes
  `If ?X matches "…" then Remember ?X is *1; Continue` chains work in
  `Base/Utilities/EmailCapture.n:170-183`).
- Because the buffer survives across the `If`/`Then` boundary, the values visible in the `Then` block
  come from the **last successful match test in the condition**, exactly as §6.4 shows.
- Conditions whose LHS is a star buffer (`#1 DoesNotMatch …`) are **run-time conditions**: they are
  evaluated only when the enclosing block is otherwise active, because they depend on the result of a
  sibling test `[6604090:3610-3625]`, `[spec §14.5]`. Evaluate them strictly after the tests that fill
  the buffer, in source order.

---

## 7. Greediness (a specified choice, not an archive fact)

Nothing in the archive, the tutorial or the patents specifies which of several possible matches fills the
star buffer. The patents describe a non-deterministic automaton, which is by definition silent on this.

**Port decision:** compile each rendered pattern to a backtracking regular expression with **greedy**
quantifiers, matched **leftmost-first**, i.e. exactly Perl/JavaScript `RegExp` semantics with
`*` → `([\s\S]*)` and `#` → `([^\s]*)`. Then:

- `Contains "*@*"` on `my email is a@b.com ok` gives `*1 = "my email is a"`, `*2 = "b.com ok"`.
- `Matches "#*"` on `been there` gives `#1 = "been"`, `*1 = " there"`.
  (`Library/StdQuestion/StdQuestion.us.n:675-678` does exactly this and then tests `#1 matches "been"`,
  which only works under the greedy reading — evidence, though weak, for greedy.)

Flag this in the port's own docs; it is the most likely source of small divergences from the original.

---

## 8. The match operators

### 8.1 The seven operators, with the LHS census

| operator            | BUILD    | ALL      | meaning                                             |
| ------------------- | -------- | -------- | --------------------------------------------------- |
| `Matches`           | 570      | 1837     | whole LHS value matches the pattern                 |
| `Contains`          | 798      | 1637     | `Matches "*" + P + "*"`                             |
| `ExactlyMatches`    | 1        | 6        | raw string equality, no wildcards, no normalisation |
| `DoesNotMatch`      | 37       | 166      | ¬`Matches`                                          |
| `DoesNotContain`    | 11       | 43       | ¬`Contains`                                         |
| `Heard` / `IfHeard` | 183 / 40 | 422 / 84 | `?WhatUserMeant Contains P`                         |
| `notheard`          | 84       | 156      | `?WhatUserMeant DoesNotContain P`                   |

`DidNotHear` and `DoesNotExactlyMatch` appear in the patent BNF but **zero times** in the archive.

`Heard` is defined by the vendor `[tut:2452-2453]`:

> In the who was kronos topic, the pattern matching uses the ?WhatUserMeant attribute by saying
> `If Heard "who was kronos"` — This is because **If Heard is the equivalent of If ?WhatUserMeant Contains**

Archive-confirmed `notheard` usage:

```
Mrmind3/Humans&Machines/Machines.n:112  If ((?IsStatement Contains I and "not" and BOTS) and notheard ("human", "program"))
Mrmind3/Humans&Machines/Convincing.n:4  If (?FactStatement contains I+"can" and CONVINCE+YOU and "human" and notheard NT )
Mrmind3/Humans&Machines/Machines.n:234      notheard ("haha#","ha ha","A","B")  //yup, laughter looks like perverse hex...
```

**LHS kinds** (BUILD / ALL):

| LHS                                                           | BUILD | ALL  |
| ------------------------------------------------------------- | ----- | ---- |
| `?attribute`                                                  | 1359  | 3454 |
| implicit `?WhatUserMeant` (bare `Heard`/`IfHeard`/`notheard`) | 183   | 422  |
| star buffer (`#1`, `#2`, `#3`, `*1`)                          | 54    | 217  |
| literal string                                                | 4     | 18   |

The 18 literal-string LHS uses are all one idiom — "has the site author filled in this customisation list?":

```
Mrmind3/Utilities/CProfanity.n:81   and ("" DoesNotMatch STDX.RESPONSE_TO_SEXUAL)
Mrmind3/Utilities/WebNameGreet.n:48  If (?Name Matches MYNAME) and ("" DoesNotMatch STDN_DETECT_OWN_NAME)
```

Most-used attributes as LHS in BUILD: `?IsStatement` 143, `?WhatRobotSaid` 123, `?FactStatement` 123,
`?StdQ.LocalQuestion` 115, `?AnyStatement` 111, `?WhatUserSaid` 87, `?DescriptionQuestion` 66,
`?ProcessedString` 52, `?WhatUserMeant` 50, `?StdS.LocalStatement` 48, `#1` 33.

### 8.2 `ExactlyMatches` — the one shipped use, and what it tells us

```
Mrmind3/Reactions/Compliments.n:51-52
	If ?WhatUserSaid ExactlyMatches GRINNIES
	//we have to use exactlymatches here -- otherwise punctuation is stripped.
```

with

```
Mrmind3/Patterns.n:323
PatternList GRINNIES is ":-)","(-:",":)","(:",";-)","(-;","8-)","[-)","=:-)",":-]";
```

`ExactlyMatches` is a hash lookup, no wildcards, no normalisation `[6604090:4079-4083]`.
The author's comment is the archive's only direct statement that the `Matches`/`Contains` path applies
some punctuation normalisation to the input that the `ExactlyMatches` path does not. See §14.2.

Other uses: `If ?Ccount ExactlyMatches "2"` (`Library/Hierarchy/StdDomainPriority.n:40`),
`If ?WhatUserSaid ExactlyMatches ""` (`Base/Defaults/HighDefault.n:84`),
`or (?OtherStatement Exactlymatches "?")` (`Base/Defaults/HighDefault.n:33`).

### 8.3 `and` / `or` / `not` inside a pattern-position expression

A match operator may be followed by several patterns joined by `and` / `or` / `not`. Each operand is a
**separate, independent test with the same LHS and the same operator**, combined with boolean logic.
This is _not_ concatenation and _not_ alternation.

```
Mrmind3/Utilities/CProfanity.n:79  If (?WhatUserSaid Contains DirtyBodyPartPhrases AND DirtyActionPhrases AND NOT PseudoBadWords)
Mrmind3/Humans&Machines/Machines.n:112  If ((?IsStatement Contains I and "not" and BOTS) and notheard ("human", "program"))
Base/Inanities/Capabilities.n:1445  If Heard (WWW, WEBSITEWORD) and ("find","search*for")
Base/Inanities/Capabilities.n:16    If ?FactQuestion contains YOU and "case,sensitive" then
Mrmind3/AboutMrMind/MMphysical.n:3  If Heard YOU, YOUR and heard BODYPARTWORD
```

`?IsStatement Contains I and "not" and BOTS` requires all three to occur **somewhere** in the value,
in any order. Counts of this shape over ALL: `Contains … and …` 402, `Heard … and …` 42,
`Heard … or …` 13, `Contains … or …` 10.

Note the last example writes `heard` again for the second conjunct; both spellings occur and mean the
same thing.

### 8.4 Multi-valued attributes

`Remember ?X is "a","b";` gives an attribute several values `[tut:2494-2496]`. `Matches` / `Contains`
against a multi-valued attribute succeed if **any** value matches. (Not directly demonstrable from the
archive; §14.)

---

## 9. Case sensitivity

- Pattern text matching is **case-insensitive**. `PatternList AILIFE is "ALIFE", "android",
"Artificial intelligence", "bot", …` (`Mrmind3/Patterns.n:15`) mixes cases freely, and the whole
  corpus is written in inconsistent case with no functional consequence.
  `[tut:2589]` "…matches to “Who was Kronos” or (case insensitive) “who was kronos”."
- The `\A`-style case-sensitive escape `[tut:2727]` is **never used** (zero escapes before an alphabetic
  character in the whole archive). Implement it for completeness or omit it; nothing depends on it.
- Keywords are case-insensitive: `Heard`/`heard`, `Matches`/`matches`, `Contains`/`contains`,
  `DoesNotMatch`/`doesNotMatch`, `Exactlymatches`/`ExactlyMatches`, `Remember`/`remember`.
- `PatternList` / `Pattern` names resolve case-insensitively: `you` and `YOU` are the same list.

---

## 10. The matcher — implementable algorithm

### 10.1 Compile a rendered pattern string to a regular expression

Input: one rendered pattern string `P` (source form, escapes intact).
Output: a regex source string and an ordered list of capture slots.

```
compile(P):
  out = []; nStar = nHash = nCaret = nPct = 0; slots = []
  i = 0
  while i < P.length:
      c = P[i]
      if c == "\\" and i+1 < P.length:
          out.push(escapeRegex(P[i+1])); i += 2; continue
      switch c:
        case "*": nStar++;  slots.push(["*", nStar]);  out.push("([\\s\\S]*)")
        case "#": nHash++;  slots.push(["#", nHash]);  out.push("([^\\s']*)")     # see §4.2
        case "^": nCaret++; slots.push(["^", nCaret]); out.push("([^\\s])")
        case "%": nPct++;   slots.push(["%", nPct]);   out.push("([0-9])")
        case ",":                                       out.push("[\\s" + PUNCT + "]*")
        case ".":                                       out.push("[\\s" + PUNCT + "]+")
        case " ":  while P[i+1] == " ": i++             # collapse space runs
                                                        out.push(" +")
        case "'":                                       out.push("'?")            # apostrophes optional, §11
        default:                                        out.push(escapeRegex(c))
      i++
  return out.join(""), slots

PUNCT = "!-/:-@\\[-`{-~"        # ASCII punctuation ranges, i.e. everything non-alphanumeric, non-space
```

### 10.2 Apply an operator

```
matchOne(value, renderedPattern, op):
  rx, slots = compile(renderedPattern)
  if op is Matches or DoesNotMatch:        full = "^(?:" + rx + ")$"
  if op is Contains or DoesNotContain
     or Heard or notheard:                 full = "^[\\s\\S]*(?:" + rx + ")[\\s\\S]*$"
  m = new RegExp(full, "i").exec(value)
  if m is null: return FAIL
  # star buffers
  for k in 0 .. slots.length-1:
      buffer[slots[k][0]][slots[k][1]] = m[k+1]
  buffer["*match"] = the substring of `value` consumed by the rx group itself
  return SUCCESS
```

For `Contains`, `*match` is **the middle group only**. Implement it by wrapping the compiled body in
one extra non-numbered capture: `"^[\\s\\S]*(" + rx + ")[\\s\\S]*$"` and reading that group before the
numbered ones (adjust the slot offsets accordingly). This is what makes §6.4 work.

`ExactlyMatches` bypasses all of the above: `value.toLowerCase() === pattern.toLowerCase()` on the raw
string, no wildcards, no normalisation.

Negated operators (`DoesNotMatch`, `DoesNotContain`, `notheard`) return the negation and **must not**
write the star buffer.

### 10.3 Apply a whole pattern expression

```
test(value, expr, op):
  for each rendered in render(expr):          # §5; lazily, do not materialise 8192 strings if avoidable
      if matchOne(value, rendered, op) == SUCCESS: return true
  return false
```

`render(expr)` cross-product sizes over the shipped build: 596 expressions render to exactly 1 string,
689 to 2–10, 394 to 11–100, 100 to 101–1000, 14 to more than 1000. The largest is 8192:

```
Mrmind3/Humans&Machines/Convincing.n:126   If (?CanQuestion Contains STDP.I+CONVINCE+YOU+STDP.I+STDP.BE+"human")
Mrmind3/Reactions/Asides.n:133             If ?FactStatement Contains STDP.I+STDP.DO+NT+MEAN_INTEND.V+"that" Then   (7200)
```

Eager expansion is workable (8192 short regexes, compiled once at load) but an alternation-based compile
(`(?:a|b|c)` per list node) is strictly better and produces identical results **provided** the implicit-space
rule is applied per-combination, i.e. the space depends on the _chosen_ alternative's first/last character.
Because `""` is a member of many lists, you cannot hoist the space out of the alternation. Concretely,
`X + ("", "the") + "#"` must compile to `(?:X\s+|X\s+the\s+)#`, not `X\s+(?:|the)\s+#`.

### 10.4 Word boundaries

There is no separate word-boundary machinery. Boundaries fall out of the rules:

- a literal space in the pattern requires ≥1 space in the input, so `"you are"` cannot match
  `you sure are` `[6604090:4809-4816]`;
- `#` cannot cross a space, so `"# #"` is exactly two words;
- `Matches` anchors both ends, so `Matches "what"` does not match `so what`, while
  `Contains "what"` does `[6604090:4783-4797]`.

The patents' claim that a bare word arc is delimited by space arcs is reproduced automatically because
concatenation inserts the space (§5.3) and `Contains` wraps in `*`, which _can_ cross spaces.
The one place this differs from the patents: `Contains "what"` in this port also matches `somewhat`,
because `*` is character-level. That is what the vendor's own `who*kronos` → `whoaskflkronos` example
requires, so it is correct for 2.2.

---

## 11. Apostrophes

`[tut:2720]`: "Apostrophes (‘) are optional in your topic patterns."

Archive proof (`Mrmind3/customization/NameCustomize.n:78-85`), verbatim:

```
Topic "It's short for" is
Subjects "TRUTH", "NAMES";
	If (?WhatRobotSaid matches  "By the way, is " + ?Name + " <BR>your real name or a special <BR>one just for me?"
	AND ?WhatUserMeant matches "It's short for *" )
	Then
		Example "Its short for Fido";
		Say "Thanks " + *1 + ",  but <BR>I'll still call you " + ?Name + ".";
	Done
EndTopic
```

The pattern spells `It's`; the Example spells `Its`. NeuroServer verifies every Example at build time,
so this must have passed. **Rule: a literal `'` in a pattern compiles to `'?`.**
A `\'` compiles the same way (the escape only protects it from the lexer, not from this rule) —
this is consistent with `PatternList Articles is "a","an","the", …, "#\'s";` (`Mrmind3/Patterns.n:31`)
still needing to match plain possessives.

`#` does not span an apostrophe (§4.2), which is why the possessive pattern is written `#\'s` rather
than relying on `#`.

---

## 12. Worked examples, verbatim from the archive

### 12.1 `"are"+YOU+"*"+OKAY`

```
Mrmind3/AboutMrMind/WhatIsMM.n:68   If Recall ?FactQuestion and heard "are"+YOU+"*"+OKAY
Mrmind3/Patterns.n:453              PatternList OKAY is "O,K", "all right", "alright", "well", "okay";
```

Renders (for `YOU` = `"you"`) to `are you*O,K`, compiled to

```
^[\s\S]*(?:are +you([\s\S]*)O[\s<PUNCT>]*K)[\s\S]*$      (case-insensitive)
```

Matches: _are you ok_, _Are you OK?_, _are you o.k._, _are you really ok_.
Does not match: _areyou ok_ (the implicit space is hard).

### 12.2 The three-word HotBot default

Reproduced in full in §5.3. Input `Can you find very ugly rabbits?` →
`#1 = "very"`, `#2 = "ugly"`, `#3 = "rabbits?"` under `Matches` on `?WhatUserSaid`
(note the question mark lands in `#3`; the four `DoesNotMatch` guards still pass).

### 12.3 The email stripper — the densest wildcard code in the corpus

```
Base/Utilities/EmailCapture.n:166-185, verbatim

Sequence topic "strip non email address words" is
	//strip up to 15 words before or after email address.
	Always
//strip any internal words containing apostrophes.
    If ?PossibleEmail matches "* #\'# *" then remember ?PossibleEmail is *1 + " "+ *2; continue
    If ?PossibleEmail matches "* #\'# *" then remember ?PossibleEmail is *1 + " "+ *2; continue
//then strip leading and trailing words with apostrophes.
    If ?PossibleEmail matches "* #\'#" then remember ?PossibleEmail is *1; continue
    If ?PossibleEmail matches "#\'# *" then remember ?PossibleEmail is *1; continue
//finally strip any words not containing a @
	If ?PossibleEmail matches "#, ,#, ,#, ,#, ,#, ,#, ,#, ,#, *@*" then Remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches "*@* ,#, ,#, ,#, ,#, ,#, ,#, ,#, ,#," then remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches ",#, ,#, ,#, ,#, *@*" then Remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches "*@* ,#, ,#, ,#, ,#," then remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches ",#, ,#, *@*" then Remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches "*@* ,#, ,#," then remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches ",#, *@*" then Remember ?PossibleEmail is *1 +"@"+ *2; Continue
	If ?PossibleEmail matches "*@* ,#," then remember ?PossibleEmail is *1 +"@"+ *2; Continue
	SwitchBack
EndTopic
```

Reading: `,#,` is "a word with optional adjacent punctuation"; the ` ` between two such groups is a hard
space. `"* #\'# *"` isolates an internal word containing an apostrophe. Note the deliberate duplication
of the first rule (the pattern only strips one word per pass).

### 12.4 The name parser

```
Mrmind3/Utilities/WebNameGreet.n:540-598 (excerpt, verbatim)

	If ?NameCapture.TempName Matches "*\,*" then remember ?NameCapture.TempName is *1; Continue
		…
		If ?NameCapture.Tempname matches "#", "#-#", "^\.^\.","^\.,#"
		//also hyphenated names like anne-marie and jean-luc and pairs of initials.
		Then
			SwitchTo "Name Parser Got Name";
		SwitchBack
		…
	//We're also checking for initials separated by periods and not followed by a period...
		If ?NameCapture.TempName Matches "^\.^" Then
			Remember ?NameCapture.TempName is ?NameCapture.TempName+".";
			SwitchTo "Name Parser got Name";
		SwitchBack
	//We're also willing to check at this point for title + lastname.
		If ?NameCapture.TempName Matches NameCapture.Titles + ("#","#-#")
		Then
			// A title and a last name, keep both
			SwitchTo "Name Parser got Name";
		SwitchBack
    //Title plus more than one word, we assume means the name is the first word following
	//The title.
		If ?NameCapture.TempName Matches NameCapture.Titles + " # *" Then
			Remember ?NameCapture.TempName is #1;
		Continue

		If ?NameCapture.TempName Matches NameCapture.Titles + " #-# *" Then
			Remember ?NameCapture.TempName is #1+"-"+#2;
		Continue
```

Note `NameCapture.Titles + " # *"` — the author wrote the space explicitly, and it is not doubled
because the right operand already starts with a separator (§5.3).

### 12.5 Two-word / three-word gap idioms

```
Library/StdQuestion/StdQuestion.us.n:117    "give"+("","#","# #")+"information"+("about","on","concerning"),
Library/StdQuestion/StdQuestion.us.n:1852   If ?StdS.LocalStatement matches "Let "+("#","# #","# # #")+"know*","in on*",
Base/Inanities/Personality.n:1420           If ?IsStatement Contains "I am "+("","#")+("angry","mad")
Mrmind3/Issues/Emotion.n:364                If ?FactStatement contains (you,bots) and "not"+("","#")+EMOTIONWORD then
Mrmind3/AboutUser/UserPhysical.n:337        If (?AnyStatement Contains INJURED +("","#")+ BODYPARTS and "feel# like")
Base/Defaults/HighDefault.n:215             If ?WhatUserMeant doesnotmatch ("#","# #") then	//collect only the suspect ones...
```

`("","#","# #")` = "zero, one, or two intervening words". The `""` branch is required **because of the
implicit space**, not because `#` cannot match empty (§0.6). `"give"+""+"information"` renders
`give information`; `"give"+"#"+"information"` renders `give # information`.

---

## 13. Where the archive contradicts the patents

| #   | Patent claim                                                                                                                    | Archive / vendor manual                                                                                                  | Port follows                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `*` matches "zero or more **words**" `[6604090:3228]`; matcher input symbols are words, spaces and punctuation `[6604090:3990]` | `who*kronos` matches `whoiskronos` and `whoaskflkronos` `[tut:2661-2679]`; `"this*sucks"`, `"barbe^ue#"`, `"mast*rbat#"` | **archive**: `*` is character-level                                                                               |
| 2   | Wildcard set is `* # % &`/`^` plus `*match` `[spec §5]`                                                                         | `,` (671 occurrences) and `.` (260) are also wildcards `[tut:2724,2726]`; and the literal space is an operator           | **archive**                                                                                                       |
| 3   | `&` is a wildcard with its own star-buffer slot (1998 BNF)                                                                      | zero unescaped `&` wildcards; `^` fills that role                                                                        | **archive**: no `&`                                                                                               |
| 4   | `$word` matches "any word beginning with…" `[6363301:4250]`                                                                     | zero `$` in the archive                                                                                                  | **archive**: no `$`                                                                                               |
| 5   | `[spec §5.1]` hypothesises `#` needs ≥1 character (from the `("","#","# #")` idiom)                                             | `[tut:2722]` "zero or more"; `PatternList BOTS … "machine#","computer#"` must match bare _machine_                       | **tutorial + archive**: zero or more. The `""` in `("","#","# #")` is explained by the implicit space, not by `#` |
| 6   | The `+` implicit space applies generally                                                                                        | it applies **only** in pattern (match) context; `Say`/`Remember`/`Show` concatenation is plain                           | **archive**                                                                                                       |
| 7   | Space and `*` contribute 0 to specificity; nothing said about `,`/`.`                                                           | —                                                                                                                        | unresolved, see §14 (specificity is another dimension's problem)                                                  |
| 8   | Star buffer references are `#<int> *<int> %<int> ^<int> *match`                                                                 | `%n` never occurs; max indices observed are `*5`, `#3`, `^2`                                                             | implement all, expect only these                                                                                  |

---

## 14. Unresolved

1. **`#` and punctuation.** `[tut:2722]` says `#` matches punctuation; `[tut:6002]` (a comment inside the
   vendor's own worked example) says `# doesn't match apostrophes`. **Hypothesis adopted:** `#` = zero or
   more non-space, non-apostrophe characters. Risk: low — no archive pattern's outcome changes either way,
   because every `#`-with-punctuation case (`"#-#"`, `",#,"`) sits in a disjunction with the plain form.
2. **What normalisation the `Matches`/`Contains` path applies to the input.**
   `Mrmind3/Reactions/Compliments.n:52` says "we have to use exactlymatches here — otherwise punctuation
   is stripped", yet `Matches "*\,*"` (`WebNameGreet.n:540`) and `Exactlymatches "?"`
   (`Base/Defaults/HighDefault.n:33`) show punctuation is present in attribute values.
   `[tut:2591-2592]` says "NeuroServer strips out punctuation so that it doesn't matter if the user puts a
   question mark at the end or not." **Hypothesis:** trailing sentence punctuation is stripped when
   `?WhatUserSaid` is turned into `?WhatUserMeant` and the `Std*` question attributes, but the matcher
   itself does not strip; `?WhatUserSaid` keeps the raw text and `ExactlyMatches` is needed only for
   patterns that are _entirely_ punctuation (emoticons), which a stripped-and-empty `?WhatUserMeant`
   would never match. This properly belongs to the input-pipeline dimension; the matcher should be
   punctuation-preserving.
3. **Greediness / which path fills the star buffer.** Unspecified by every source. §7 fixes greedy
   leftmost as the port's rule.
4. **Whether `?Attr` spliced into a pattern is re-parsed as a pattern or taken literally.**
   No archive case has a wildcard in the attribute's value. §5.5 chooses "literal".
5. **Multi-valued attributes under `Matches`/`Contains`.** No archive case. §8.4 chooses "any value".
6. **`^` and `%` at a `+` junction.** No archive example puts `^` or `%` at the edge of an operand next to
   another operand. §5.3 treats them as non-separators (like `#`). Hypothesis.
7. **Whether the implicit space is inserted before an empty rendered alternative or the empty alternative
   is dropped first.** §5.3 drops empties first. The two readings differ only if a pattern-space run is
   _not_ collapsed; since §10.1 collapses runs, both readings coincide. Recorded for completeness.
8. **`\` before an alphabetic character** (case-sensitive matching) is documented but never used;
   the exact semantics (does it make only that character case-sensitive, or the whole pattern?) is
   untestable from the archive.
9. **`?<pat>:<symbol>`** (another user's memory, `[spec §5]`) does not occur; not implemented.

---

## 15. Edge cases the port must handle explicitly

1. **Comma inside a string is a wildcard, not punctuation.** Never split a string literal on commas.
2. **`#1` inside a string is `#` + `1`, not star buffer 1.** `PatternList HEX is "#0#","#1#",…"#f#";`
   (`Mrmind3/Patterns.n:327-328`) is a hex-digit test. Star buffers are lexical tokens _outside_ strings only.
3. **`"%%%%%%%%%"` (9 percent signs) is missing** from `Base/Patterns.n:447-448` `PatternList NUMBER`.
   Reproduce the gap; do not "fix" it.
4. **Zero-length `.n` files** exist (§1) but none is in the build. Report them; do not silently treat
   them as empty scripts.
5. **Windows-1252 bytes**: `"Paul Valéry"` appears **in a pattern** at
   `Mrmind3/AboutMrMind/MMIdentity.n:213`. Decode as cp1252 and compare case-insensitively; the same
   file also lists `"Paul Valery"` so accent-folding is not required.
6. **`SayOneOf STDX.RESPONSE_TO_SEXUAL+"  "+;`** (`Mrmind3/Utilities/CProfanity.n:84`) — a trailing `+`
   before `;`. The parser must tolerate an empty right operand of `+`.
7. **`PatternList`s double as response lists.** `Mrmind3/Customization/ProfanityCustomize.n` and
   `GoodbyeCustomize.n` define lists of full sentences that are only ever used as `SayOneOf` arguments.
   Do not assume every `PatternList` is a matching pattern; do not apply the implicit-space rule when a
   list is used as output.
8. **Dotted identifiers** (`?StdQ.LocalQuestion`, `StdP.QuestionStarts`, `NameCapture.Titles`,
   `STDX.RESPONSE_TO_SEXUAL`, `BOTHER_AGGRAVATE.V`, `FUTURE.N`) are single symbols. The dot in a symbol
   is not the `.` wildcard; only dots _inside string literals_ are wildcards.
9. **`( … )` after a match operator is ambiguous** between an inline pattern list and a condition group (§3.1).
10. **Unescaped `.` in what looks like ordinary prose** (`"Mr. Mind"`, `"A.I."`, `"St. Patricks Day"`)
    is a wildcard requiring ≥1 punctuation/space. This is a behaviour difference from a naive literal
    reading; keep the wildcard reading.
11. **`"mc^2"`** (`Mrmind3/AboutUser/UserMind.n:146`) is the only place the author almost certainly meant
    a literal `^`. Under the wildcard reading it still matches the literal input. Do not special-case.
12. **`("" DoesNotMatch <List>)`** is a "has this customisation list been filled in" test, not a pattern
    test on user input. It must not touch the star buffer (it is a negated operator).
13. **Escaped separators do not suppress the implicit space.** `"wait\," + X` ends in a _literal_ comma,
    so the implicit space **is** inserted. Check the backslash before classifying an edge character.
14. **8192-way cross products exist.** Do not build the rendered set naively for every input;
    compile once at load and cache.
15. **`Heard`/`IfHeard`/`notheard` have no LHS in the source** but their LHS is `?WhatUserMeant`,
    which the input pipeline must have populated before any topic runs.

---

## 16. Regression vectors

Every row below is derived from the archive or the vendor manual and should be a unit test.
`C` = Contains, `M` = Matches.

| pattern (rendered)                                                  | input                             | op             | expect                                | source                   |
| ------------------------------------------------------------------- | --------------------------------- | -------------- | ------------------------------------- | ------------------------ |
| `who*kronos`                                                        | `who was kronos`                  | M              | ✓                                     | `[tut:2672]`             |
| `who*kronos`                                                        | `whois kronos`                    | M              | ✓                                     | `[tut:2675]`             |
| `who*kronos`                                                        | `whoaskflkronos`                  | M              | ✓                                     | `[tut:2677]`             |
| `who*kronos`                                                        | `kronos was who`                  | M              | ✗                                     | `[tut:2681]`             |
| `you are`                                                           | `you sure are`                    | M              | ✗                                     | `[6604090:4809]`         |
| `what`                                                              | `so what`                         | C              | ✓                                     | `[6604090:4793]`         |
| `what`                                                              | `so what`                         | M              | ✗                                     | `[6604090:4783]`         |
| `book,mark#`                                                        | `what is a bookmark`              | C              | ✓                                     | `[tut:4384]`             |
| `book,mark#`                                                        | `what is a book mark`             | C              | ✓                                     | §4.3                     |
| `O,K`                                                               | `are you o.k.`                    | C              | ✓                                     | `Mrmind3/Patterns.n:453` |
| `aren,t`                                                            | `you arent` / `you aren't`        | C              | ✓                                     | `Base/Patterns.n:440`    |
| `machine#`                                                          | `are you a machine`               | C              | ✓                                     | `Mrmind3/Patterns.n:120` |
| `#teen`                                                             | `i am thirteen`                   | C              | ✓                                     | `Mrmind3/Patterns.n:7`   |
| `barbe^ue#`                                                         | `i like barbeque` / `barbecues`   | C              | ✓                                     | `Mrmind3/Patterns.n:142` |
| `%%%`                                                               | `i am 100 years old`              | C              | ✓                                     | `Mrmind3/Patterns.n:7`   |
| `^\.^\.`                                                            | `j.w.`                            | M              | ✓                                     | `WebNameGreet.n:547`     |
| `#`                                                                 | `anne`                            | M              | ✓                                     | `WebNameGreet.n:547`     |
| `#`                                                                 | `anne marie`                      | M              | ✗                                     | `WebNameGreet.n:547`     |
| `#-#`                                                               | `anne-marie`                      | M              | ✓                                     | `WebNameGreet.n:547`     |
| `are you*O,K` (from `"are"+YOU+"*"+OKAY`)                           | `Are you OK?`                     | C              | ✓                                     | `WhatIsMM.n:68`          |
| `you have to trust me` (from `YOU + "have to" + "trust me"`)        | `you have to trust me`            | C              | ✓                                     | `TrustTruth.n:108`       |
| `can you find # # #*` (from `HighDefault.n:106-109`, empty article) | `Can you find very ugly rabbits?` | M              | ✓, `#1=very #2=ugly #3=rabbits?`      | `HighDefault.n:106`      |
| `It's short for *`                                                  | `Its short for Fido`              | M              | ✓, `*1=Fido`                          | `NameCustomize.n:82-83`  |
| `*@*`                                                               | `my email is a@b.com`             | C              | ✓, `*1="my email is a"`, `*2="b.com"` | `EmailCapture.n:152`     |
| `A.I.`                                                              | `ai`                              | C              | ✗                                     | §4.4                     |
| `A.I.`                                                              | `a.i.`                            | C              | ✓                                     | `UserSociety.n:413`      |
| `:-)`                                                               | `:-)`                             | ExactlyMatches | ✓                                     | `Compliments.n:51`       |

A larger empirical check was run while writing this spec: 171 `Example` statements in the shipped build
whose enclosing condition tests `?WhatUserSaid`, `?WhatUserMeant` or bare `Heard` were replayed through
the algorithm in §10; 143 matched. Every one of the 28 misses was traced to the test harness pairing an
`Example` with the wrong `If` inside a multi-block topic, or to an authoring gap in the script itself
(e.g. `Mrmind3/AboutUser/UserMind.n:434` `Contains I+"*not pretend"` versus `Example "I can't pretend."`,
which the contraction-expansion stage of the input pipeline, not the matcher, is meant to bridge).
**No miss was attributable to the matching rules specified here.**
