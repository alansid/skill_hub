// 網頁內建的確認視窗（取代瀏覽器的 confirm／alert，手機上比較好按，也能在各種環境使用）

function show(message: string, okText: string, cancelText: string | null): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop confirm-backdrop';
    const box = document.createElement('div');
    box.className = 'modal confirm-box';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    const text = document.createElement('p');
    text.className = 'confirm-text';
    text.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    actions.append(spacer);

    const close = (result: boolean) => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };

    if (cancelText) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = cancelText;
      cancel.onclick = () => close(false);
      actions.append(cancel);
    }
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'primary';
    ok.textContent = okText;
    ok.onclick = () => close(true);
    actions.append(ok);

    box.append(text, actions);
    backdrop.append(box);
    document.body.append(backdrop);
    document.addEventListener('keydown', onKey, true);
    ok.focus();
  });
}

export function askConfirm(message: string, okText = '確定'): Promise<boolean> {
  return show(message, okText, '返回');
}

export function showMessage(message: string): Promise<boolean> {
  return show(message, '知道了', null);
}
