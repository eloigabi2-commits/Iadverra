// O Orion no iOS ignora o CSS do scripting.insertCSS no Instagram, entao o
// estilo entra num <style> na propria pagina, que funciona em todo navegador.
if(!document.getElementById('notfollowers-style')){
    const style = document.createElement('style')
    style.id = 'notfollowers-style'
    style.textContent = `
    .modal .flex{display:flex}
    .modal .flex-col{flex-direction:column}
    .modal .items-center{align-items:center}
    .modal .justify-between{justify-content:space-between}
    .modal .justify-center{justify-content:center}
    .modal .info{margin-top:12px;line-height:1.4}
    .modal .info a{text-decoration:none;color:#e03566 !important}
    .modal .info a:hover{text-decoration:underline !important}
    .modal .result{display: flex;flex-direction: column}
    .modal .row{padding:8px 16px;color:#333}
    .modal .row:hover{background-color:#f6f6f6;text-decoration: none;color:#333}
    .modal .row:first-child{border-top:none}
    .modal .row a{text-decoration:none !important; color:#333 !important; min-width: 0;white-space: nowrap;overflow: hidden}
    .modal .row a:hover{text-decoration:none !important}
    .modal img{border-radius:100%;width:44px;height:44px;margin-right:12px}
    .modal .btn-sm{background-color:#fff !important;border:1px solid #ddd !important; color:#262626 !important;padding:5px 0;font-size:13px;border-radius:4px;user-select: none;text-align: center;width:78px;margin-left:4px}
    .modal .btn-sm.unfollow-success{color:#aaa !important;border:1px solid #eee !important}
    .modal button{cursor:pointer;appearance:none;border:none}
    .modal button:disabled{cursor:default}
    .modal button:focus{outline:none}
    .modal .h1{font-size:18px}
    .modal .mt-6{margin-top:24px}
    .modal .mt-3{margin-top:12px}
    .modal .mr-2{margin-right:8px}
    .modal .p-4{padding:16px}
    .modal .circle{border-radius:100%;width:14px;height:14px;margin-right:5px;flex-shrink:0}
    .modal .circle.warning{background-color:#f59e0b}
    .modal .circle.danger{background-color:#ef4444}
    .modal .btn-primary{background-color:#3b82f6 !important;color:#fff !important;padding:8px 16px;font-size:14px;border-radius:5px}
    .modal .btn-primary:hover{background-color:#2563eb !important}
    .modal .btn-primary:disabled{background-color:#93c5fd !important;cursor:default}
    .modal .warn:not(:empty){margin-top:12px;padding:12px;background-color:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:5px;line-height:1.4}
    .modal .warn b{font-weight:600}
    .modal .status{margin-top:24px;display:flex;align-items:center}
    .modal .message:not(:empty){margin-top:12px;display:flex;align-items:center}
    .modal .message .alert{display:block;width:100%;padding:12px;background-color:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:5px;line-height:1.4}
    .modal .message .alert b{font-weight:600}
    .loading{animation:spin .7s linear infinite}
    @keyframes spin{100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}
    .modal{
        position: fixed;
        right: 0;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 9999 !important;
        background-color: rgba(0, 0, 0, 0.65);
        width: 100%;
        height: 100%;
        color: #262626 !important;
    }
    .modal-dialog{
        height: calc(100% - 40px);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 20px;
    }
    .modal-content{
        background-color: #fff;
        height: 100%;
        max-height: 640px;
        overflow: hidden;
        width: 100%;
        max-width: 500px;
        position: relative;
        display: flex;
        flex-direction: column;
        border-radius: 12px;
    }
    .modal-header{
        padding:16px;
    }
    .modal-body{
        overflow-y: auto;
    }

    .modal a.banner{
        margin-top: 12px;
        display: block;
        padding: 12px;
        background-color: #333;
        color: #eee !important;
        border-radius: 5px;
        box-shadow: 0px 3px 10px rgba(0,0,0,.25);
        line-height: 1.4;
        transition:background-color .2s ease-in-out
    }
    .modal a.banner span{
        font-weight: 600;
    }
    .modal a.banner:hover{
        text-decoration: none !important;
        background-color: #111;
    }
    `
    document.head.appendChild(style)
}