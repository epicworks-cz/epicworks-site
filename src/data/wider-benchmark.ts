// EpicScan wider benchmark (2026-11-21): 9 published CVEs, one file each, vulnerable and patched,
// 3 runs per file. Local scan: Qwen 3.6 35B A3B on our Mac Studio, 5 triage rounds.
// Second opinion: Claude Opus 4.6 on every finding the local triage kept, and in a second pass
// on every finding it rejected. Source data: business-ideas/26Q4-06-nano-analyzer-epic-scan/benchmarks/README.md

export type Run = {
  candidates: number; // findings the local scan raised for triage
  kept: number; // kept by local triage
  confirmed: number; // of those, confirmed by Opus
  uncertain: number;
  rejected: number; // rejected by Opus
  found: boolean; // a confirmed finding names the CVE's bug
};

export type App = {
  slug: string;
  app: string;
  cve: string;
  published: string;
  file: string;
  lines: number;
  repo: string; // https URL of the repository
  vulnCommit: string;
  fixCommit: string;
  commitUrl: (c: string) => string;
  bugClass: string;
  bug: string;
  vulnerable: Run[];
  patched: Run[];
  scanMinutes: number; // local scan time, all 6 runs
  opusUsd: number; // both Opus passes, all 6 runs
  headline: string;
  summary: string;
  story: string[];
  takeaway: string;
};

const gh = (repo: string) => (c: string) => `https://github.com/${repo}/commit/${c}`;
const r = (candidates: number, kept: number, confirmed: number, uncertain: number, rejected: number, found = false): Run =>
  ({ candidates, kept, confirmed, uncertain, rejected, found });

export const apps: App[] = [
  {
    slug: 'gnutls-cve-2025-9820',
    app: 'GnuTLS', cve: 'CVE-2025-9820', published: '2026-11-22',
    file: 'lib/pkcs11_write.c', lines: 1434,
    repo: 'https://gitlab.com/gnutls/gnutls', vulnCommit: '42a9dc307209', fixCommit: '1d56f96f6ab5',
    commitUrl: (c) => `https://gitlab.com/gnutls/gnutls/-/commit/${c}`,
    bugClass: 'Stack buffer overflow (CWE-121)',
    bug: 'gnutls_pkcs11_token_init() copies the token label into a fixed 32-byte stack buffer with the length of the label, not the length of the buffer.',
    vulnerable: [r(5, 3, 1, 0, 2, true), r(4, 2, 1, 0, 1, true), r(1, 1, 1, 0, 0, true)],
    patched: [r(4, 3, 0, 0, 3), r(4, 1, 0, 0, 1), r(4, 1, 0, 0, 1)],
    scanMinutes: 45, opusUsd: 2.30,
    headline: 'GnuTLS CVE-2025-9820: found in every run',
    summary: 'A textbook stack overflow in PKCS#11 token setup. The local model found it in 3 of 3 runs, Opus confirmed it each time at 95%, and every false alarm was removed.',
    story: [
      'This is the case the pipeline is built for. The buffer is declared a few lines above a memcpy that uses strlen() of the caller\'s string, and nothing in between checks the length. The local model reported it in every run, and the local triage kept it every time.',
      'Opus confirmed it in all three runs with the same reasoning: a 32-byte stack buffer, a copy of strlen(label) bytes, and no bounds check, in a public API function. It named both lines.',
      'Around it, the local model also kept eight other findings across the vulnerable and patched files, mostly "NULL pointer" claims on required API parameters. Opus rejected all of them, explaining that passing NULL to a required parameter of a C library is a caller bug, not an attack path. The patched file came out clean in all three runs.',
    ],
    takeaway: 'Overflows with an explicit length mismatch in one function are where a local model plus an Opus check is reliable.',
  },
  {
    slug: 'imagemagick-cve-2025-65955',
    app: 'ImageMagick', cve: 'CVE-2025-65955', published: '2026-11-22',
    file: 'Magick++/lib/Options.cpp', lines: 996,
    repo: 'https://github.com/ImageMagick/ImageMagick', vulnCommit: '9c0546a6e2c3', fixCommit: '6f81eb15f822',
    commitUrl: gh('ImageMagick/ImageMagick'),
    bugClass: 'Wrong pointer freed, double free / use after free (CWE-415)',
    bug: 'Options::fontFamily() with an empty string frees the font field instead of the family field, leaving a dangling pointer behind.',
    vulnerable: [r(3, 1, 0, 0, 1), r(1, 0, 0, 0, 0), r(3, 1, 1, 0, 0, true)],
    patched: [r(4, 1, 0, 0, 1), r(3, 1, 0, 0, 1), r(4, 2, 0, 0, 2)],
    scanMinutes: 44, opusUsd: 1.45,
    headline: 'ImageMagick CVE-2025-65955: a copy-paste bug, found once in three runs',
    summary: 'A one-word copy-paste error in the C++ API. The local model found it in 1 of 3 runs; Opus confirmed it at 97% and spotted that it was a copy of the correct setter above it.',
    story: [
      'The fix changed one word: the setter released the wrong field. Bugs like this are hard for a scanner, because the code looks correct line by line. It is only wrong compared with what it is supposed to do.',
      'In runs 1 and 2 the local model looked elsewhere (unchecked allocations, a dash-pattern array) and Opus rejected what it kept. In run 3 it reported the fontFamily setter. Opus confirmed it at 97% and explained it the way a reviewer would: the line frees the font field, while the identical font() setter a few lines above shows the intended pattern.',
      'The patched file kept one or two findings per run. Opus rejected all of them, citing ImageMagick conventions such as allocation failures that end the process instead of returning NULL.',
    ],
    takeaway: 'Lifetime bugs are found sometimes, not reliably. When the local model does report one, the Opus check confirms it convincingly.',
  },
  {
    slug: 'libpng-cve-2026-22695',
    app: 'libpng', cve: 'CVE-2026-22695', published: '2026-11-22',
    file: 'pngread.c', lines: 4112,
    repo: 'https://github.com/pnggroup/libpng', vulnCommit: '16b5e3823918', fixCommit: '218612ddd6b1',
    commitUrl: gh('pnggroup/libpng'),
    bugClass: 'Heap buffer over-read (CWE-125)',
    bug: 'png_image_finish_read() over-reads the heap for interlaced 16-bit images read into 8-bit output with a non-minimal row stride. It is a regression introduced by the fix for an earlier CVE.',
    vulnerable: [r(2, 0, 0, 0, 0), r(3, 0, 0, 0, 0), r(1, 0, 0, 0, 0)],
    patched: [r(2, 0, 0, 0, 0), r(3, 0, 0, 0, 0), r(3, 1, 0, 0, 1)],
    scanMinutes: 61, opusUsd: 3.35,
    headline: 'libpng CVE-2026-22695: missed in all runs',
    summary: 'A regression that needs four conditions at once. The local model circled the right area (row stride arithmetic) but never described the real bug, and its own triage rejected every candidate.',
    story: [
      'The bug only appears with a specific combination: an interlaced image, 16-bit samples, 8-bit output and a row stride larger than the minimum. It sits in a 4,112-line file.',
      'The local model raised one to three candidates per run, mostly integer overflow in row stride and row byte calculations. Its triage rejected all of them, so nothing reached the Opus check in the vulnerable runs. In a second pass we sent every rejected candidate to Opus as well. Opus agreed with every rejection: the arithmetic the candidates described is bounded, and none of them described the real over-read.',
      'The patched file kept one finding in one run, a claimed overflow in png_read_row. Opus rejected it at 95%, showing that the row buffers are sized from the same values.',
    ],
    takeaway: 'Bugs that need a precise combination of conditions in a large file are beyond the local model in this setup. A stronger checker does not help when the bug is never described.',
  },
  {
    slug: 'mupdf-cve-2026-25556',
    app: 'MuPDF', cve: 'CVE-2026-25556', published: '2026-11-22',
    file: 'source/fitz/util.c', lines: 1240,
    repo: 'https://github.com/ArtifexSoftware/mupdf', vulnCommit: '5590f13dd6a3', fixCommit: 'd4743b6092d5',
    commitUrl: gh('ArtifexSoftware/mupdf'),
    bugClass: 'Double free (CWE-415)',
    bug: 'fz_fill_pixmap_from_display_list() drops a pixmap it does not own in its error path, so the caller frees it a second time.',
    vulnerable: [r(3, 2, 0, 1, 1), r(2, 2, 0, 0, 2), r(4, 0, 0, 0, 0)],
    patched: [r(3, 2, 0, 0, 2), r(3, 2, 1, 0, 1), r(3, 2, 0, 0, 2)],
    scanMinutes: 40, opusUsd: 2.09,
    headline: 'MuPDF CVE-2026-25556: missed in all runs',
    summary: 'An ownership bug in an exception path. The local model never looked at it; Opus removed almost all of what it reported instead.',
    story: [
      'MuPDF uses its own exception macros (fz_try, fz_catch, fz_rethrow). The bug is a single drop of a caller-owned object inside a catch block. To see it, you have to know who owns the pixmap.',
      'The local model spent its attention on JPEG marker parsing and text flattening. Opus rejected 8 of the 10 findings it kept, often with exact arithmetic. For example, it showed that a claimed infinite loop cannot happen because the position always advances by two bytes first.',
      'Opus marked one finding as uncertain and confirmed one unrelated claim on the patched file (unbounded recursion). We have not verified it, so we do not describe it further here.',
    ],
    takeaway: 'Ownership bugs in exception paths need knowledge of project conventions that the local scan does not use.',
  },
  {
    slug: 'ffmpeg-cve-2026-64830',
    app: 'FFmpeg', cve: 'CVE-2026-64830', published: '2026-11-22',
    file: 'libavformat/mpeg.c', lines: 1074,
    repo: 'https://github.com/FFmpeg/FFmpeg', vulnCommit: 'cce1b4f2289f', fixCommit: 'dbd495f066a8',
    commitUrl: gh('FFmpeg/FFmpeg'),
    bugClass: 'Heap buffer overflow (CWE-122)',
    bug: 'The VobSub subtitle demuxer accepts more distinct stream IDs than its fixed-size array can hold.',
    vulnerable: [r(3, 1, 0, 0, 1), r(3, 1, 0, 0, 1), r(3, 1, 0, 0, 1)],
    patched: [r(3, 2, 0, 0, 2), r(4, 2, 0, 0, 2), r(3, 2, 0, 0, 2)],
    scanMinutes: 63, opusUsd: 2.07,
    headline: 'FFmpeg CVE-2026-64830: missed, but zero false alarms left',
    summary: 'The local model never found the stream-count overflow. Opus rejected all 9 findings it kept, citing FFmpeg\'s own API contracts.',
    story: [
      'The overflow needs a subtitle file that declares more streams than an array allows. The local model looked at stream handling in the same file, but at a different function, where the stream index is validated by every caller.',
      'All 9 findings that survived local triage were wrong, and Opus rejected every one. Most claimed out-of-bounds reads in the format probe. Opus pointed out that FFmpeg guarantees zero padding after every probe buffer (AVPROBE_PADDING_SIZE), so those reads stay inside allocated memory.',
      'The second pass, Opus on the findings the local triage rejected, recovered nothing. The closest candidates described code that is guarded by its callers.',
    ],
    takeaway: 'Even when the bug is missed, the Opus check stops a report full of wrong claims from reaching the customer.',
  },
  {
    slug: 'alsa-lib-cve-2026-56109',
    app: 'alsa-lib', cve: 'CVE-2026-56109', published: '2026-11-22',
    file: 'src/conf.c', lines: 5875,
    repo: 'https://github.com/alsa-project/alsa-lib', vulnCommit: 'd983a9ccbc75', fixCommit: '536dd6f8affd',
    commitUrl: gh('alsa-project/alsa-lib'),
    bugClass: 'Double free (CWE-415)',
    bug: 'parse_def() continues after a failed nested parse, so the same configuration node is deleted twice.',
    vulnerable: [r(4, 2, 0, 0, 2), r(3, 1, 1, 0, 0), r(3, 3, 1, 0, 2)],
    patched: [r(1, 1, 0, 1, 0), r(1, 1, 0, 0, 1), r(5, 3, 0, 0, 3)],
    scanMinutes: 101, opusUsd: 5.81,
    headline: 'alsa-lib CVE-2026-56109: the largest file, missed in all runs',
    summary: 'A missing return-value check in a 5,875-line parser. The fix is four lines. The local model never reported it, and this file cost the most time and Opus budget.',
    story: [
      'The fix adds one check after a recursive call. Finding the bug means following error handling through a recursive parser in the largest file of the set.',
      'The local model reported memory growth, plugin loading and path handling. Opus rejected the plugin "remote code execution" claims, explaining that ALSA configuration files are trusted input and loading plugins from them is a documented feature.',
      'Opus confirmed two unrelated claims: one it also rejected in another run, and one about a copy guarded only by an assert. We have not verified either, so we do not describe them further here.',
    ],
    takeaway: 'Large files cost the most and give the local model the least. A missing error check deep in a recursive parser is a typical miss.',
  },
  {
    slug: 'libgit2-cve-2026-53583',
    app: 'libgit2', cve: 'CVE-2026-53583', published: '2026-11-22',
    file: 'src/libgit2/streams/openssl.c', lines: 764,
    repo: 'https://github.com/libgit2/libgit2', vulnCommit: '607c9229a2a6', fixCommit: 'c2aa35409ee0',
    commitUrl: gh('libgit2/libgit2'),
    bugClass: 'Improper certificate validation (CWE-295)',
    bug: 'verify_server_cert() inverts a memcmp() result when comparing an IP address host with a certificate\'s IP SubjectAltName.',
    vulnerable: [r(1, 1, 0, 0, 1), r(4, 2, 1, 0, 1), r(3, 1, 0, 0, 1)],
    patched: [r(1, 1, 1, 0, 0), r(4, 1, 0, 0, 1), r(3, 2, 0, 0, 2)],
    scanMinutes: 20, opusUsd: 1.70,
    headline: 'libgit2 CVE-2026-53583: one character of logic, missed in all runs',
    summary: 'The smallest file and the smallest fix: an inverted comparison. The local model never saw it. It is the clearest example of a bug that pattern matching cannot find.',
    story: [
      'The vulnerable line compares two IP addresses with an inverted result. There is no memory error and no unusual API, only logic that means the opposite of what it should.',
      'The local model focused on how the code reads the SubjectAltName union before checking its type. Opus confirmed that claim twice and rejected it twice with opposite reasoning. We treat it as not a bug, and it is a useful reminder that a single Opus verdict is not proof.',
      'Everything else the local model kept was rejected, and neither file kept a finding about the fixed comparison.',
    ],
    takeaway: 'Inverted logic in security checks needs a model that reasons about intent. Repeated runs also show where the checker itself is unsure.',
  },
  {
    slug: 'rsync-cve-2026-45232',
    app: 'rsync', cve: 'CVE-2026-45232', published: '2026-11-22',
    file: 'socket.c', lines: 841,
    repo: 'https://github.com/RsyncProject/rsync', vulnCommit: 'c79cb81a4f07', fixCommit: 'a5fc5ebe7a8e',
    commitUrl: gh('RsyncProject/rsync'),
    bugClass: 'Off-by-one stack write (CWE-193)',
    bug: 'establish_proxy_connection() writes one byte past the end of a stack buffer when an HTTP proxy returns a response line that fills the buffer.',
    vulnerable: [r(4, 2, 0, 0, 2), r(1, 1, 0, 0, 1), r(3, 2, 1, 0, 1)],
    patched: [r(4, 1, 1, 0, 0), r(4, 0, 0, 0, 0), r(3, 2, 1, 0, 1)],
    scanMinutes: 47, opusUsd: 1.68,
    headline: 'rsync CVE-2026-45232: right function, wrong half',
    summary: 'The local model looked at the right function every time, but at the request it sends, not the response it reads. The one-byte write was never reported.',
    story: [
      'The function builds an HTTP CONNECT request and then reads the proxy\'s reply into the same buffer. The bug is in the reply loop: a line that fills the buffer makes the code write a terminating zero one byte too far.',
      'The local model reported issues in the request half, an assert on very long host names and how the connect program is expanded. Opus confirmed the assert crash in both files at 72%, but that code did not change in the fix. It aborts the program instead of corrupting memory, and the host name comes from the user\'s own command line. We do not count it as a real finding. Opus also confirmed, at only 52%, a claim about how the connect program is expanded; we have not verified it.',
      'No file kept a finding about the response-line overflow, and the second Opus pass recovered nothing.',
    ],
    takeaway: 'Finding the right function is not enough. Off-by-one bugs need the exact loop bound to be checked, and the local model did not do that here.',
  },
  {
    slug: 'nginx-cve-2026-32647',
    app: 'nginx', cve: 'CVE-2026-32647', published: '2026-11-22',
    file: 'src/http/modules/ngx_http_mp4_module.c', lines: 3984,
    repo: 'https://github.com/nginx/nginx', vulnCommit: 'd787755d50c9', fixCommit: '7725c372c2fe',
    commitUrl: gh('nginx/nginx'),
    bugClass: 'Buffer over-read and over-write (CWE-125, CWE-787)',
    bug: 'The MP4 streaming module mishandles empty stco and co64 atoms, which leads to a buffer over-read or over-write in the worker process.',
    vulnerable: [r(3, 1, 0, 0, 1), r(3, 1, 0, 0, 1), r(2, 0, 0, 0, 0)],
    patched: [r(1, 0, 0, 0, 0), r(3, 0, 0, 0, 0), r(3, 0, 0, 0, 0)],
    scanMinutes: 52, opusUsd: 4.70,
    headline: 'nginx CVE-2026-32647: close, but not there',
    summary: 'The local model raised the stco and co64 atoms by name, but described index arithmetic that is already bounds-checked. The empty-atom edge case was never stated.',
    story: [
      'The fix is about atoms with zero entries. All the checks in the module look correct for normal input; the problem is the edge case they do not cover.',
      'In one run the local model raised the exact atoms, stco and co64, but claimed the chunk index could run past the buffer. Opus showed the explicit check that prevents that. It was right: that is not the bug. No run described the empty-atom case.',
      'The patched file never kept a finding, so the Opus check had nothing to remove there. This was the most expensive file per Opus call, because the module is long and every call includes the whole file.',
    ],
    takeaway: 'Being near the bug is not the same as finding it. Edge cases such as an empty input need the scanner to ask what happens at zero.',
  },
];

export const totals = {
  runs: 54,
  vulnerableRuns: 27,
  foundRuns: 4,
  cvesFound: 2,
  patchedClean: 27,
  survivors: 66,
  realKept: 4,
  noise: 62,
  noiseRejected: 52,
  noiseUncertain: 2,
  noiseConfirmed: 8,
  rejectedRechecked: 91,
  rejectedRecovered: 0,
  opusSurvivorsUsd: 11.72,
  opusRejectedUsd: 13.43,
  opusTotalUsd: 25.15,
  scanHours: 7.9,
};
