// 데이터셋 레지스트리 — 지도·통계·인덱스 생성기가 **모두 이 파일 하나**를 읽는다.
//
// ★새 리스트를 올릴 때 여기 한 줄만 추가하면 지도 마커·카테고리 패널·통계 리스트 선택·
//   통계 인덱스가 전부 따라온다. 예전에는 같은 정보를 네 군데(js/map.js DATASETS,
//   stats.html LIST_CATEGORY·LIST_OPTS, scripts/gen_stats_index.py, js/status-key.js)에
//   따로 적어야 했고, 한 군데를 빠뜨리면 그 리스트만 통계에서 0으로 잡혔다
//   (영준님 2026-09-03 "리스트 올리면 코드가 알아서 정상으로 읽어야지").
//
// 파이썬 쪽 거울 = scripts/datasets.py. 둘이 어긋나면 scripts/test_datasets_parity.py 가 잡는다.
//
// 필드
//   code       통계 인덱스의 리스트 코드(1글자). 인덱스 파일에 `l` 로 실린다.
//   file       지도가 읽는 데이터 파일
//   archives   통계 분모에만 더하는 파일들(지도에는 안 올라가지만 누적 실적이라 분모엔 있어야 한다)
//   category   상태키 네임스페이스 이름. js/status-key.js NAMESPACED_CATEGORIES 와 짝이다
//   label      마커에 찍을 글자. null 이면 계기 개수 숫자
//   uiLabel    지도 카테고리 패널 표시명
//   statsLabel 통계 리스트 선택 버튼 표시명(없으면 uiLabel)
//   dateField  있으면 카테고리 밑에 날짜 체크박스 트리를 자동 생성
//   metersKey  한 레코드가 계기 묶음인 데이터셋의 계기 배열 필드명.
//              지정하면 통계 인덱스가 계기 단위로 펼친다(안 펼치면 한 함체가 1계기로 잡힌다)
//   onMap      false 면 지도에 안 올린다(통계 분모 전용)
//   defaultOn  true 면 처음 보는 순간 켜진 채로(기존 선택이 있어도). js/map.js getSelectedCategories
//   noStats    true 면 통계 분모·선택지에서 뺀다(scripts/datasets.py stats_sources 와 짝)
//   allowGroup 지정하면 그 계정 그룹에만 보인다(js/auth.js AUTH_GROUPS). 통계 분모에서도 빠진다
//              ★2026-09-20 현재 쓰는 리스트가 없다 — 25미청구·미청구불가는 전 작업자 공개다
const DATASET_REGISTRY = [
    // 광명맵 — 광명지사 리스트 하나뿐(아미맵에서 분리, 2026-10-30).
    { code: 'w', file: './data/gwangmyeong-data.json', category: '광명', label: '광',
      uiLabel: '광명지사', allowGroup: 'kmtest', dateField: '묶음', defaultOff: true,
      groupOrder: ['광명동', '철산·하안', '소하·일직', '학온·옥길'] },
    // TOU 는 내려둔 상태다(2026-08-02). 되살리려면 아래 줄을 되돌리고
    //   getSelectedCategories 의 ALL 에도 다시 넣어야 한다.
    // { code: 't', file: './data/tou-data.json', category: 'tou', label: 'TOU', uiLabel: 'TOU' },
];

/** 계정 제한이 걸린 데이터셋이 이 사용자에게 보이는가 (2026-09-15 신설).
 *
 * ★왜 여기서 거르나: 지도는 DATASETS 를 **다섯 군데**에서 쓴다(로드·카테고리 패널·
 *   선택 카테고리·마커·날짜 트리). 화면마다 계정을 검사하면 한 군데만 빠뜨려도 새어 나간다.
 *   목록 자체를 걸러 두면 아래 모든 곳이 자동으로 따라온다.
 * ★실제 판정은 js/auth.js 의 authAllows() 가 한다 — '관리자 + 윤용운' 조합이
 *   map.html·stats.html 에도 있어서, 판정을 한 함수로 모아 두지 않으면 또 어긋난다.
 * ★평가 시점이 안전한 이유: map.html 은 이 파일보다 **먼저** authRequire() 를 부른다
 *   (미로그인이면 로그인 화면으로 보내므로, 여기 도달했다는 건 세션이 있다는 뜻이다).
 *   stats.html 도 auth.js 를 먼저 싣는다.
 * ★세션을 못 읽으면 **숨기는 쪽**으로 넘어진다 — 새는 것보다 안 보이는 편이 낫다.
 */
function datasetVisibleToUser(d) {
    // ★인증 계층이 아예 없는 곳(node 도구·검사 드라이버)은 '화면'이 아니다 — 전체를 본다.
    //   여기서 숨기면 scripts/test_status_key_parity.py 가 파이썬 거울과 어긋났다고 잡는다.
    //   브라우저 화면에는 auth.js 가 항상 먼저 실려 있으므로 이 갈래로 빠지지 않는다.
    if (typeof authAllowsGroup !== 'function') return true;
    try {
        // ★전용 그룹 계정(다른 회사 — 광명 kmtest)은 **그 그룹 리스트만** 본다(2026-10-30).
        //   allowGroup 없는 공개 리스트도 숨긴다. 판정 중 예외가 나면 아래 catch 로 숨긴다.
        const ex = (typeof authExclusiveGroup === 'function') ? authExclusiveGroup() : null;
        if (ex) return d.allowGroup === ex;
        if (!d.allowGroup) return true;
        return authAllowsGroup(d.allowGroup);
    } catch (e) {
        return false;
    }
}

// 지도에 올리는 데이터셋만. ★이름이 `DATASETS` 인 이유: js/map.js 가 이 이름을 쓴다.
//   ★map.js 에서 다시 선언하면 안 된다 — 클래식 스크립트는 전역을 공유해서 const 중복선언이
//     SyntaxError 를 내고 map.js 가 통째로 안 돈다(2026-09-03 지도 먹통 사고).
const DATASETS = DATASET_REGISTRY.filter(
    d => d.onMap !== false && d.file && datasetVisibleToUser(d));
const MAP_DATASETS = DATASETS;

/** 통계 인덱스 코드 -> 상태키 카테고리. 네임스페이스 판정에 쓴다. */
const DATASET_CATEGORY_BY_CODE = Object.fromEntries(
    DATASET_REGISTRY.filter(d => d.category).map(d => [d.code, d.category])
);

/** 통계 리스트 선택 버튼 목록. '전체 누적'은 코드가 아니라 모드라 따로 붙인다.
 *
 * done: 지도에서 내린 리스트 = 남은 할 일이 없는 '끝난 실적'이다. 통계는 누적이라 분모에는
 *   그대로 두되, 화면에서 '지금 할 일'과 섞이면 진척을 오해한다(영준님 2026-09-09).
 *   ★onMap 에서 파생한다 — 따로 표를 두면 리스트를 내릴 때 한쪽을 빠뜨린다.
 */
//   ★계정 제한이 걸린 리스트는 통계 선택지에서도 뺀다(확인용이라 실적 분모가 아니다).
//     단 statsEvenIfGroup 이 걸린 것은 실적이라 남긴다 — scripts/datasets.py stats_sources() 와 짝이다.
const DATASET_STATS_OPTS = DATASET_REGISTRY
    .filter(d => datasetVisibleToUser(d) && !d.noStats && (!d.allowGroup || d.statsEvenIfGroup))
    .map(d => ({
        key: d.code, label: d.statsLabel || d.uiLabel || d.category,
        done: d.onMap === false,
    }));

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DATASET_REGISTRY, DATASETS, MAP_DATASETS,
                       DATASET_CATEGORY_BY_CODE, DATASET_STATS_OPTS };
}
