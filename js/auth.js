// auth.js — 광명맵 계정 (보기 전용 단일 계정)
//
// 광명맵은 아미맵에서 광명지사 리스트만 떼어 낸 별도 사이트다(2026-10-30).
//   ★이 파일에는 광명 계정만 둔다 — 다른 계정을 넣지 않는다.
//   ★저장 키는 'gm_' 로 시작한다. 같은 도메인(github.io)의 다른 앱과 로그인 정보를 섞지 않는다.

const ACCOUNTS = [
    { id: 'kmtest', pw: '1111', name: '광명', role: 'user' },
];

const AUTH_KEY = 'gm_auth';
// 강제 로그아웃 버전 — 긴급(보안/중대버그)시에만 올린다.
const FORCE_LOGOUT_VERSION = '20261030a';
const FORCE_LOGOUT_VERSION_KEY = 'gm_force_logout_version';
// 강제 로그아웃 때 함께 지울 화면 상태 키
const UI_STATE_KEYS = ['ami_map_view'];

/** 로그인 시도 */
function authLogin(id, pw) {
    const account = ACCOUNTS.find(a => a.id === id && a.pw === pw);
    if (!account) {
        return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }
    const session = { id: account.id, name: account.name, role: account.role };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    localStorage.setItem(FORCE_LOGOUT_VERSION_KEY, FORCE_LOGOUT_VERSION);
    return { ok: true };
}

/** 현재 로그인 세션, 없으면 null. 계정 목록에 없는 id 는 세션으로 인정하지 않는다. */
function authGetSession() {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        const s = raw ? JSON.parse(raw) : null;
        return (s && ACCOUNTS.some(a => a.id === s.id)) ? s : null;
    } catch {
        return null;
    }
}

/** 계정 묶음 — 광명 하나뿐. 리스트의 allowGroup 과 맞춘다. */
const AUTH_GROUPS = {
    kmtest: ['kmtest'],
};

/** 전용(배타) 그룹 — 이 그룹 계정은 그 그룹 리스트만 보고, 보기 전용(view-only.js)으로 돈다. */
const AUTH_EXCLUSIVE = ['kmtest'];

function authExclusiveGroup() {
    const s = authGetSession();
    if (!s) return null;
    for (const g of AUTH_EXCLUSIVE) {
        if ((AUTH_GROUPS[g] || []).includes(s.id)) return g;
    }
    return null;
}

function authAllowsGroup(group) {
    const ids = AUTH_GROUPS[group] || [];
    const s = authGetSession();
    if (!s) return false;
    return ids.includes(s.id);
}

function authLogout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
}

function authForceLogoutNow() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(FORCE_LOGOUT_VERSION_KEY);
    UI_STATE_KEYS.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    window.location.replace('login.html');
}

// 아미맵 코드와 이름을 맞춰 둔다(firebase.js 가 부른다). 보기 전용이라 미룰 일이 없다.
function authCompletePendingLogout() {}

/** 로그인 여부 확인 — 미인증이면 login.html 로 */
function authRequire() {
    const localVer = localStorage.getItem(FORCE_LOGOUT_VERSION_KEY);
    if (localVer && localVer !== FORCE_LOGOUT_VERSION) {
        authForceLogoutNow();
        return;
    }
    if (!authGetSession()) {
        window.location.href = 'login.html';
        return;
    }
    if (!localVer) localStorage.setItem(FORCE_LOGOUT_VERSION_KEY, FORCE_LOGOUT_VERSION);
}
