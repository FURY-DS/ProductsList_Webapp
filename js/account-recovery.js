/* =====================================================
   account-recovery.js - 아이디찾기 / 비밀번호찾기 / 비밀번호변경 모달

   - 로그인 화면(오버레이)의 "아이디 찾기" / "비밀번호 찾기" 링크
   - 헤더의 사용자명 배지 클릭 → "비밀번호 변경" 모달
   - 각 모달은 내부 step 전환 (1:입력 → 2:인증 → 3:결과)
   ===================================================== */

const AccountRecovery = {
  // ===== 아이디 찾기 =====
  init() {
    this._initFindIdModal();
    this._initFindPwModal();
    this._initChangePwModal();
    this._initAuthOverlayLinks();
  },

  // -----------------------------------------------
  //  로그인 오버레이의 "아이디 찾기"/"비밀번호 찾기" 링크
  // -----------------------------------------------
  _initAuthOverlayLinks() {
    const findIdLink = document.getElementById('link-find-id');
    const findPwLink = document.getElementById('link-find-pw');

    if (findIdLink) {
      findIdLink.addEventListener('click', () => {
        this.openFindIdModal();
      });
    }
    if (findPwLink) {
      findPwLink.addEventListener('click', () => {
        this.openFindPwModal();
      });
    }
  },

  // -----------------------------------------------
  //  아이디 찾기 모달
  // -----------------------------------------------
  _initFindIdModal() {
    const cancel = document.getElementById('find-id-cancel');
    const send = document.getElementById('find-id-send');
    const back = document.getElementById('find-id-back');
    const verify = document.getElementById('find-id-verify');
    const done = document.getElementById('find-id-done');

    if (cancel) cancel.addEventListener('click', () => this.closeFindIdModal());
    if (send) send.addEventListener('click', () => this._handleFindIdSend());
    if (back) back.addEventListener('click', () => this._showFindIdStep(1));
    if (verify) verify.addEventListener('click', () => this._handleFindIdVerify());
    if (done) done.addEventListener('click', () => {
      this.closeFindIdModal();
      // 로그인 탭으로 전환 + 아이디 자동 채움
      const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
      if (loginTab) loginTab.click();
      const usernameInput = document.getElementById('auth-username');
      if (usernameInput && this._foundUsername) {
        usernameInput.value = this._foundUsername;
        const pwInput = document.getElementById('auth-password');
        if (pwInput) pwInput.focus();
      }
    });

    // 모달 바깥 클릭 시 닫기
    const modal = document.getElementById('find-id-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeFindIdModal();
      });
    }

    // 인증번호 입력란: 숫자만
    const codeInput = document.getElementById('find-id-code');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
      });
    }
  },

  openFindIdModal() {
    this._resetFindIdModal();
    const modal = document.getElementById('find-id-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeFindIdModal() {
    const modal = document.getElementById('find-id-modal');
    if (modal) modal.style.display = 'none';
  },

  _resetFindIdModal() {
    this._showFindIdStep(1);
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('find-id-name', '');
    setVal('find-id-email', '');
    setVal('find-id-code', '');
    this._setErr('find-id-error', '');
    this._setErr('find-id-error2', '');
    const devHint = document.getElementById('find-id-dev-hint');
    if (devHint) { devHint.classList.add('hidden'); devHint.textContent = ''; }
  },

  _showFindIdStep(n) {
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`find-id-step${i}`);
      if (el) el.classList.toggle('hidden', i !== n);
    }
  },

  _setErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  },

  async _handleFindIdSend() {
    const name = document.getElementById('find-id-name').value.trim();
    const email = document.getElementById('find-id-email').value.trim();
    this._setErr('find-id-error', '');

    if (!name || !email) {
      this._setErr('find-id-error', '이름과 이메일을 모두 입력해주세요');
      return;
    }

    const sendBtn = document.getElementById('find-id-send');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '발송 중...'; }

    const result = await Auth.findIdRequest(name, email);
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '인증번호 발송'; }

    if (!result.ok) {
      this._setErr('find-id-error', result.msg);
      return;
    }

    // dev mode면 화면에 힌트로 표시
    if (result.devCode) {
      const devHint = document.getElementById('find-id-dev-hint');
      if (devHint) {
        devHint.textContent = `⚙️ 개발 모드: 인증번호 ${result.devCode} (이메일 미설정 — RESEND_API_KEY 필요)`;
        devHint.classList.remove('hidden');
      }
    }

    this._showFindIdStep(2);
    // 2단계 진입 시 인증번호 입력으로 포커스
    setTimeout(() => {
      const codeInput = document.getElementById('find-id-code');
      if (codeInput) codeInput.focus();
    }, 50);
  },

  async _handleFindIdVerify() {
    const name = document.getElementById('find-id-name').value.trim();
    const email = document.getElementById('find-id-email').value.trim();
    const code = document.getElementById('find-id-code').value.trim();
    this._setErr('find-id-error2', '');

    if (code.length !== 6) {
      this._setErr('find-id-error2', '인증번호 6자리를 입력해주세요');
      return;
    }

    const verifyBtn = document.getElementById('find-id-verify');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = '확인 중...'; }

    const result = await Auth.findIdVerify(name, email, code);
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = '확인'; }

    if (!result.ok) {
      this._setErr('find-id-error2', result.msg);
      return;
    }

    this._foundUsername = result.username;
    const usernameEl = document.getElementById('find-id-result-username');
    const emailEl = document.getElementById('find-id-result-email');
    if (usernameEl) usernameEl.textContent = result.username;
    if (emailEl) emailEl.textContent = `등록 이메일: ${result.maskedEmail || email}`;
    this._showFindIdStep(3);
  },

  // -----------------------------------------------
  //  비밀번호 찾기 모달
  // -----------------------------------------------
  _initFindPwModal() {
    const cancel = document.getElementById('find-pw-cancel');
    const send = document.getElementById('find-pw-send');
    const back = document.getElementById('find-pw-back');
    const verify = document.getElementById('find-pw-verify');
    const done = document.getElementById('find-pw-done');

    if (cancel) cancel.addEventListener('click', () => this.closeFindPwModal());
    if (send) send.addEventListener('click', () => this._handleFindPwSend());
    if (back) back.addEventListener('click', () => this._showFindPwStep(1));
    if (verify) verify.addEventListener('click', () => this._handleFindPwVerify());
    if (done) done.addEventListener('click', () => {
      this.closeFindPwModal();
      const loginTab = document.querySelector('.auth-tab[data-mode="login"]');
      if (loginTab) loginTab.click();
      const usernameInput = document.getElementById('auth-username');
      if (usernameInput && this._foundUsername) {
        usernameInput.value = this._foundUsername;
        const pwInput = document.getElementById('auth-password');
        if (pwInput) pwInput.focus();
      }
    });

    const modal = document.getElementById('find-pw-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeFindPwModal();
      });
    }

    const codeInput = document.getElementById('find-pw-code');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
      });
    }
  },

  openFindPwModal() {
    this._resetFindPwModal();
    const modal = document.getElementById('find-pw-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeFindPwModal() {
    const modal = document.getElementById('find-pw-modal');
    if (modal) modal.style.display = 'none';
  },

  _resetFindPwModal() {
    this._showFindPwStep(1);
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('find-pw-name', '');
    setVal('find-pw-username', '');
    setVal('find-pw-email', '');
    setVal('find-pw-code', '');
    setVal('find-pw-new', '');
    setVal('find-pw-new-confirm', '');
    this._setErr('find-pw-error', '');
    this._setErr('find-pw-error2', '');
    const devHint = document.getElementById('find-pw-dev-hint');
    if (devHint) { devHint.classList.add('hidden'); devHint.textContent = ''; }
  },

  _showFindPwStep(n) {
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`find-pw-step${i}`);
      if (el) el.classList.toggle('hidden', i !== n);
    }
  },

  async _handleFindPwSend() {
    const name = document.getElementById('find-pw-name').value.trim();
    const username = document.getElementById('find-pw-username').value.trim();
    const email = document.getElementById('find-pw-email').value.trim();
    this._setErr('find-pw-error', '');

    if (!name || !username || !email) {
      this._setErr('find-pw-error', '이름, 아이디, 이메일을 모두 입력해주세요');
      return;
    }

    const sendBtn = document.getElementById('find-pw-send');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '발송 중...'; }

    const result = await Auth.findPasswordRequest(name, username, email);
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '인증번호 발송'; }

    if (!result.ok) {
      this._setErr('find-pw-error', result.msg);
      return;
    }

    if (result.devCode) {
      const devHint = document.getElementById('find-pw-dev-hint');
      if (devHint) {
        devHint.textContent = `⚙️ 개발 모드: 인증번호 ${result.devCode} (이메일 미설정)`;
        devHint.classList.remove('hidden');
      }
    }

    this._showFindPwStep(2);
    setTimeout(() => {
      const codeInput = document.getElementById('find-pw-code');
      if (codeInput) codeInput.focus();
    }, 50);
  },

  async _handleFindPwVerify() {
    const name = document.getElementById('find-pw-name').value.trim();
    const username = document.getElementById('find-pw-username').value.trim();
    const email = document.getElementById('find-pw-email').value.trim();
    const code = document.getElementById('find-pw-code').value.trim();
    const newPassword = document.getElementById('find-pw-new').value;
    const newPasswordConfirm = document.getElementById('find-pw-new-confirm').value;

    this._setErr('find-pw-error2', '');

    if (code.length !== 6) {
      this._setErr('find-pw-error2', '인증번호 6자리를 입력해주세요');
      return;
    }
    if (newPassword.length < 6) {
      this._setErr('find-pw-error2', '새 비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      this._setErr('find-pw-error2', '새 비밀번호가 일치하지 않습니다');
      return;
    }

    const verifyBtn = document.getElementById('find-pw-verify');
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = '재설정 중...'; }

    const result = await Auth.findPasswordVerify(name, username, email, code, newPassword);
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = '비밀번호 재설정'; }

    if (!result.ok) {
      this._setErr('find-pw-error2', result.msg);
      return;
    }

    this._foundUsername = username;
    this._showFindPwStep(3);
  },

  // -----------------------------------------------
  //  비밀번호 변경 모달 (로그인 상태)
  // -----------------------------------------------
  _initChangePwModal() {
    const cancel = document.getElementById('change-pw-cancel');
    const submit = document.getElementById('change-pw-submit');

    if (cancel) cancel.addEventListener('click', () => this.closeChangePwModal());
    if (submit) submit.addEventListener('click', () => this._handleChangePw());

    const modal = document.getElementById('change-pw-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeChangePwModal();
      });
    }
  },

  openChangePwModal() {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('change-pw-current', '');
    setVal('change-pw-new', '');
    setVal('change-pw-confirm', '');
    this._setErr('change-pw-error', '');
    const modal = document.getElementById('change-pw-modal');
    if (modal) modal.style.display = 'flex';
    setTimeout(() => {
      const cur = document.getElementById('change-pw-current');
      if (cur) cur.focus();
    }, 50);
  },

  closeChangePwModal() {
    const modal = document.getElementById('change-pw-modal');
    if (modal) modal.style.display = 'none';
  },

  async _handleChangePw() {
    const current = document.getElementById('change-pw-current').value;
    const newPw = document.getElementById('change-pw-new').value;
    const confirm = document.getElementById('change-pw-confirm').value;

    this._setErr('change-pw-error', '');

    if (!current) {
      this._setErr('change-pw-error', '현재 비밀번호를 입력해주세요');
      return;
    }
    if (newPw.length < 6) {
      this._setErr('change-pw-error', '새 비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (newPw !== confirm) {
      this._setErr('change-pw-error', '새 비밀번호가 일치하지 않습니다');
      return;
    }
    if (current === newPw) {
      this._setErr('change-pw-error', '새 비밀번호는 현재 비밀번호와 달라야 합니다');
      return;
    }

    const submitBtn = document.getElementById('change-pw-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '변경 중...'; }

    const result = await Auth.changePassword(current, newPw);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '변경하기'; }

    if (!result.ok) {
      this._setErr('change-pw-error', result.msg);
      return;
    }

    if (typeof showToast === 'function') {
      showToast('✅ 비밀번호가 변경되었습니다');
    }
    this.closeChangePwModal();
  }
};

// -----------------------------------------------
//  사용자명 배지 클릭 → 비밀번호 변경 모달
// -----------------------------------------------
function bindUserBadgeClick() {
  const badge = document.getElementById('user-badge');
  if (!badge) return;
  badge.addEventListener('click', () => {
    if (Auth.isAuthenticated()) {
      AccountRecovery.openChangePwModal();
    }
  });
}

// 전역 노출
window.AccountRecovery = AccountRecovery;
window.bindUserBadgeClick = bindUserBadgeClick;
