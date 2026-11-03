import{$ as e,An as t,At as n,B as r,Bt as i,Ct as a,Ft as o,G as s,It as c,Lt as l,N as u,Nn as d,Nt as f,Pt as p,R as m,T as h,U as g,Vt as _,Yt as v,Zt as y,d as b,dt as x,en as S,f as C,fn as w,ft as T,g as E,gn as D,i as O,l as k,ln as A,lt as ee,nn as j,o as M,qt as N,r as P,rn as F,t as I,un as L}from"./format-BwPmLEL_.js";import{A as R,w as z}from"./index-CCTT1o7n.js";import{n as B,t as V}from"./column-BcSwTEGG.js";import{t as te}from"./chevronright-BXDUeseP.js";import{i as ne,n as H,r as U}from"./categorias-BZGoNwrN.js";import{t as W}from"./selectbutton-2Ntj9FhK.js";import{n as re,t as ie}from"./relatorioExcel-BryD8qYo.js";var ae=E.extend({name:`tabs`,style:`
    .p-tabs {
        display: flex;
        flex-direction: column;
    }

    .p-tablist {
        display: flex;
        position: relative;
        overflow: hidden;
        background: dt('tabs.tablist.background');
    }

    .p-tablist-viewport {
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior: contain auto;
    }

    .p-tablist-viewport::-webkit-scrollbar {
        display: none;
    }

    .p-tablist-tab-list {
        position: relative;
        display: flex;
        border-style: solid;
        border-color: dt('tabs.tablist.border.color');
        border-width: dt('tabs.tablist.border.width');
    }

    .p-tablist-content {
        flex-grow: 1;
    }

    .p-tablist-nav-button {
        all: unset;
        position: absolute !important;
        flex-shrink: 0;
        inset-block-start: 0;
        z-index: 2;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: dt('tabs.nav.button.background');
        color: dt('tabs.nav.button.color');
        width: dt('tabs.nav.button.width');
        transition:
            color dt('tabs.transition.duration'),
            outline-color dt('tabs.transition.duration'),
            box-shadow dt('tabs.transition.duration');
        box-shadow: dt('tabs.nav.button.shadow');
        outline-color: transparent;
        cursor: pointer;
    }

    .p-tablist-nav-button:focus-visible {
        z-index: 1;
        box-shadow: dt('tabs.nav.button.focus.ring.shadow');
        outline: dt('tabs.nav.button.focus.ring.width') dt('tabs.nav.button.focus.ring.style') dt('tabs.nav.button.focus.ring.color');
        outline-offset: dt('tabs.nav.button.focus.ring.offset');
    }

    .p-tablist-nav-button:hover {
        color: dt('tabs.nav.button.hover.color');
    }

    .p-tablist-prev-button {
        inset-inline-start: 0;
    }

    .p-tablist-next-button {
        inset-inline-end: 0;
    }

    .p-tablist-prev-button:dir(rtl),
    .p-tablist-next-button:dir(rtl) {
        transform: rotate(180deg);
    }

    .p-tab {
        flex-shrink: 0;
        cursor: pointer;
        user-select: none;
        position: relative;
        border-style: solid;
        white-space: nowrap;
        gap: dt('tabs.tab.gap');
        background: dt('tabs.tab.background');
        border-width: dt('tabs.tab.border.width');
        border-color: dt('tabs.tab.border.color');
        color: dt('tabs.tab.color');
        padding: dt('tabs.tab.padding');
        font-weight: dt('tabs.tab.font.weight');
        transition:
            background dt('tabs.transition.duration'),
            border-color dt('tabs.transition.duration'),
            color dt('tabs.transition.duration'),
            outline-color dt('tabs.transition.duration'),
            box-shadow dt('tabs.transition.duration');
        margin: dt('tabs.tab.margin');
        outline-color: transparent;
    }

    .p-tab:not(.p-disabled):focus-visible {
        z-index: 1;
        box-shadow: dt('tabs.tab.focus.ring.shadow');
        outline: dt('tabs.tab.focus.ring.width') dt('tabs.tab.focus.ring.style') dt('tabs.tab.focus.ring.color');
        outline-offset: dt('tabs.tab.focus.ring.offset');
    }

    .p-tab:not(.p-tab-active):not(.p-disabled):hover {
        background: dt('tabs.tab.hover.background');
        border-color: dt('tabs.tab.hover.border.color');
        color: dt('tabs.tab.hover.color');
    }

    .p-tab-active {
        background: dt('tabs.tab.active.background');
        border-color: dt('tabs.tab.active.border.color');
        color: dt('tabs.tab.active.color');
    }

    .p-tabpanels {
        background: dt('tabs.tabpanel.background');
        color: dt('tabs.tabpanel.color');
        padding: dt('tabs.tabpanel.padding');
        outline: 0 none;
    }

    .p-tabpanel:focus-visible {
        box-shadow: dt('tabs.tabpanel.focus.ring.shadow');
        outline: dt('tabs.tabpanel.focus.ring.width') dt('tabs.tabpanel.focus.ring.style') dt('tabs.tabpanel.focus.ring.color');
        outline-offset: dt('tabs.tabpanel.focus.ring.offset');
    }

    .p-tablist-active-bar {
        z-index: 1;
        display: block;
        position: absolute;
        inset-block-end: dt('tabs.active.bar.bottom');
        height: dt('tabs.active.bar.height');
        background: dt('tabs.active.bar.background');
        transition: 250ms cubic-bezier(0.35, 0, 0.25, 1);
    }
`,classes:{root:function(e){return[`p-tabs p-component`,{"p-tabs-scrollable":e.props.scrollable}]}}}),G={name:`Tabs`,extends:{name:`BaseTabs`,extends:b,props:{value:{type:[String,Number],default:void 0},lazy:{type:Boolean,default:!1},scrollable:{type:Boolean,default:!1},showNavigators:{type:Boolean,default:!0},tabindex:{type:Number,default:0},selectOnFocus:{type:Boolean,default:!1}},style:ae,provide:function(){return{$pcTabs:this,$parentInstance:this}}},inheritAttrs:!1,emits:[`update:value`],data:function(){return{d_value:this.value}},watch:{value:function(e){this.d_value=e}},methods:{updateValue:function(e){this.d_value!==e&&(this.d_value=e,this.$emit(`update:value`,e))},isVertical:function(){return this.orientation===`vertical`}}};function K(e,t,n,r,i,a){return y(),l(`div`,N({class:e.cx(`root`)},e.ptmi(`root`)),[S(e.$slots,`default`)],16)}G.render=K;var q={name:`TabList`,extends:{name:`BaseTabList`,extends:b,props:{},style:E.extend({name:`tablist`,classes:{root:`p-tablist`,content:`p-tablist-content p-tablist-viewport`,tabList:`p-tablist-tab-list`,activeBar:`p-tablist-active-bar`,prevButton:`p-tablist-prev-button p-tablist-nav-button`,nextButton:`p-tablist-next-button p-tablist-nav-button`}}),provide:function(){return{$pcTabList:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`],data:function(){return{isPrevButtonEnabled:!1,isNextButtonEnabled:!0}},resizeObserver:void 0,inkBarObserver:void 0,watch:{showNavigators:function(e){e?this.bindResizeObserver():this.unbindResizeObserver()},activeValue:{flush:`post`,handler:function(){this.updateInkBar(),this.bindInkBarObserver()}}},mounted:function(){var e=this;setTimeout(function(){e.updateInkBar(),e.bindInkBarObserver()},150),this.showNavigators&&(this.updateButtonState(),this.bindResizeObserver())},updated:function(){this.showNavigators&&this.updateButtonState()},beforeUnmount:function(){this.unbindResizeObserver(),this.unbindInkBarObserver()},methods:{onScroll:function(e){this.showNavigators&&this.updateButtonState(),e.preventDefault()},onPrevButtonClick:function(){var e=this.$refs.content,t=this.getVisibleButtonWidths(),n=r(e)-t,i=Math.abs(e.scrollLeft)-n*.8,a=Math.max(i,0);e.scrollLeft=s(e)?-1*a:a},onNextButtonClick:function(){var e=this.$refs.content,t=this.getVisibleButtonWidths(),n=r(e)-t,i=Math.abs(e.scrollLeft)+n*.8,a=e.scrollWidth-n,o=Math.min(i,a);e.scrollLeft=s(e)?-1*o:o},bindResizeObserver:function(){var e=this;this.resizeObserver=new ResizeObserver(function(){return e.updateButtonState()}),this.resizeObserver.observe(this.$refs.list)},unbindResizeObserver:function(){var e;(e=this.resizeObserver)==null||e.unobserve(this.$refs.list),this.resizeObserver=void 0},bindInkBarObserver:function(){var e=this;this.unbindInkBarObserver();var t=this.$refs.content,n=x(t,`[data-pc-name="tab"][data-p-active="true"]`);n&&(this.inkBarObserver=new ResizeObserver(function(){return e.updateInkBar()}),this.inkBarObserver.observe(n))},unbindInkBarObserver:function(){var e;(e=this.inkBarObserver)==null||e.disconnect(),this.inkBarObserver=void 0},updateInkBar:function(){var e=this.$refs,t=e.content,n=e.inkbar,r=e.tabs;if(n){var i=x(t,`[data-pc-name="tab"][data-p-active="true"]`);this.$pcTabs.isVertical()?(n.style.height=h(i)+`px`,n.style.top=u(i).top-u(r).top+`px`):(n.style.width=ee(i)+`px`,n.style.left=u(i).left-u(r).left+`px`)}},updateButtonState:function(){var e=this.$refs,t=e.list,n=e.content,i=n.scrollTop,a=n.scrollWidth,o=n.scrollHeight,s=n.offsetWidth,c=n.offsetHeight,l=Math.abs(n.scrollLeft),u=[r(n),g(n)],d=u[0],f=u[1];this.$pcTabs.isVertical()?(this.isPrevButtonEnabled=i!==0,this.isNextButtonEnabled=t.offsetHeight>=c&&parseInt(i)!==o-f):(this.isPrevButtonEnabled=l!==0,this.isNextButtonEnabled=t.offsetWidth>=s&&parseInt(l)!==a-d)},getVisibleButtonWidths:function(){var e=this.$refs,t=e.prevButton,n=e.nextButton,r=0;return this.showNavigators&&(r=(t?.offsetWidth||0)+(n?.offsetWidth||0)),r}},computed:{templates:function(){return this.$pcTabs.$slots},activeValue:function(){return this.$pcTabs.d_value},showNavigators:function(){return this.$pcTabs.showNavigators},prevButtonAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.previous:void 0},nextButtonAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.next:void 0},dataP:function(){return T({scrollable:this.$pcTabs.scrollable})}},components:{ChevronLeftIcon:ne,ChevronRightIcon:te},directives:{ripple:k}},J=[`data-p`],oe=[`aria-label`,`tabindex`],se=[`data-p`],ce=[`aria-orientation`],le=[`aria-label`,`tabindex`];function ue(e,t,n,r,i,a){var s=j(`ripple`);return y(),l(`div`,N({ref:`list`,class:e.cx(`root`),"data-p":a.dataP},e.ptmi(`root`)),[a.showNavigators&&i.isPrevButtonEnabled?L((y(),l(`button`,N({key:0,ref:`prevButton`,type:`button`,class:e.cx(`prevButton`),"aria-label":a.prevButtonAriaLabel,tabindex:a.$pcTabs.tabindex,onClick:t[0]||=function(){return a.onPrevButtonClick&&a.onPrevButtonClick.apply(a,arguments)}},e.ptm(`prevButton`),{"data-pc-group-section":`navigator`}),[(y(),o(F(a.templates.previcon||`ChevronLeftIcon`),N({"aria-hidden":`true`},e.ptm(`prevIcon`)),null,16))],16,oe)),[[s]]):c(``,!0),p(`div`,N({ref:`content`,class:e.cx(`content`),onScroll:t[1]||=function(){return a.onScroll&&a.onScroll.apply(a,arguments)},"data-p":a.dataP},e.ptm(`content`)),[p(`div`,N({ref:`tabs`,class:e.cx(`tabList`),role:`tablist`,"aria-orientation":a.$pcTabs.orientation||`horizontal`},e.ptm(`tabList`)),[S(e.$slots,`default`),p(`span`,N({ref:`inkbar`,class:e.cx(`activeBar`),role:`presentation`,"aria-hidden":`true`},e.ptm(`activeBar`)),null,16)],16,ce)],16,se),a.showNavigators&&i.isNextButtonEnabled?L((y(),l(`button`,N({key:1,ref:`nextButton`,type:`button`,class:e.cx(`nextButton`),"aria-label":a.nextButtonAriaLabel,tabindex:a.$pcTabs.tabindex,onClick:t[2]||=function(){return a.onNextButtonClick&&a.onNextButtonClick.apply(a,arguments)}},e.ptm(`nextButton`),{"data-pc-group-section":`navigator`}),[(y(),o(F(a.templates.nexticon||`ChevronRightIcon`),N({"aria-hidden":`true`},e.ptm(`nextIcon`)),null,16))],16,le)),[[s]]):c(``,!0)],16,J)}q.render=ue;var de=E.extend({name:`tab`,classes:{root:function(e){var t=e.instance,n=e.props;return[`p-tab`,{"p-tab-active":t.active,"p-disabled":n.disabled}]}}}),Y={name:`Tab`,extends:{name:`BaseTab`,extends:b,props:{value:{type:[String,Number],default:void 0},disabled:{type:Boolean,default:!1},as:{type:[String,Object],default:`BUTTON`},asChild:{type:Boolean,default:!1}},style:de,provide:function(){return{$pcTab:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`,`$pcTabList`],methods:{onFocus:function(){this.$pcTabs.selectOnFocus&&this.changeActiveValue()},onClick:function(){this.changeActiveValue()},onKeydown:function(e){switch(e.code){case`ArrowRight`:this.onArrowRightKey(e);break;case`ArrowLeft`:this.onArrowLeftKey(e);break;case`Home`:this.onHomeKey(e);break;case`End`:this.onEndKey(e);break;case`PageDown`:this.onPageDownKey(e);break;case`PageUp`:this.onPageUpKey(e);break;case`Enter`:case`NumpadEnter`:case`Space`:this.onEnterKey(e);break}},onArrowRightKey:function(e){var t=this.findNextTab(e.currentTarget);t?this.changeFocusedTab(e,t):this.onHomeKey(e),e.preventDefault()},onArrowLeftKey:function(e){var t=this.findPrevTab(e.currentTarget);t?this.changeFocusedTab(e,t):this.onEndKey(e),e.preventDefault()},onHomeKey:function(e){var t=this.findFirstTab();this.changeFocusedTab(e,t),e.preventDefault()},onEndKey:function(e){var t=this.findLastTab();this.changeFocusedTab(e,t),e.preventDefault()},onPageDownKey:function(e){this.scrollInView(this.findLastTab()),e.preventDefault()},onPageUpKey:function(e){this.scrollInView(this.findFirstTab()),e.preventDefault()},onEnterKey:function(e){this.changeActiveValue()},findNextTab:function(e){var t=arguments.length>1&&arguments[1]!==void 0&&arguments[1]?e:e.nextElementSibling;return t?m(t,`data-p-disabled`)||m(t,`data-pc-section`)===`activebar`?this.findNextTab(t):x(t,`[data-pc-name="tab"]`):null},findPrevTab:function(e){var t=arguments.length>1&&arguments[1]!==void 0&&arguments[1]?e:e.previousElementSibling;return t?m(t,`data-p-disabled`)||m(t,`data-pc-section`)===`activebar`?this.findPrevTab(t):x(t,`[data-pc-name="tab"]`):null},findFirstTab:function(){return this.findNextTab(this.$pcTabList.$refs.tabs.firstElementChild,!0)},findLastTab:function(){return this.findPrevTab(this.$pcTabList.$refs.tabs.lastElementChild,!0)},changeActiveValue:function(){this.$pcTabs.updateValue(this.value)},changeFocusedTab:function(t,n){e(n),this.scrollInView(n)},scrollInView:function(e){var t;e==null||(t=e.scrollIntoView)==null||t.call(e,{block:`nearest`})}},computed:{active:function(){return a(this.$pcTabs?.d_value,this.value)},id:function(){return`${this.$pcTabs?.$id}_tab_${this.value}`},ariaControls:function(){return`${this.$pcTabs?.$id}_tabpanel_${this.value}`},attrs:function(){return N(this.asAttrs,this.a11yAttrs,this.ptmi(`root`,this.ptParams))},asAttrs:function(){return this.as===`BUTTON`?{type:`button`,disabled:this.disabled}:void 0},a11yAttrs:function(){return{id:this.id,tabindex:this.active?this.$pcTabs.tabindex:-1,role:`tab`,"aria-selected":this.active,"aria-controls":this.ariaControls,"data-pc-name":`tab`,"data-p-disabled":this.disabled,"data-p-active":this.active,onFocus:this.onFocus,onKeydown:this.onKeydown}},ptParams:function(){return{context:{active:this.active}}},dataP:function(){return T({active:this.active})}},directives:{ripple:k}};function fe(e,n,r,i,a,s){var c=j(`ripple`);return e.asChild?S(e.$slots,`default`,{key:1,dataP:s.dataP,class:t(e.cx(`root`)),active:s.active,a11yAttrs:s.a11yAttrs,onClick:s.onClick}):L((y(),o(F(e.as),N({key:0,class:e.cx(`root`),"data-p":s.dataP,onClick:s.onClick},s.attrs),{default:A(function(){return[S(e.$slots,`default`)]}),_:3},16,[`class`,`data-p`,`onClick`])),[[c]])}Y.render=fe;var X={name:`TabPanels`,extends:{name:`BaseTabPanels`,extends:b,props:{},style:E.extend({name:`tabpanels`,classes:{root:`p-tabpanels`}}),provide:function(){return{$pcTabPanels:this,$parentInstance:this}}},inheritAttrs:!1};function pe(e,t,n,r,i,a){return y(),l(`div`,N({class:e.cx(`root`),role:`presentation`},e.ptmi(`root`)),[S(e.$slots,`default`)],16)}X.render=pe;var me=E.extend({name:`tabpanel`,classes:{root:function(e){return[`p-tabpanel`,{"p-tabpanel-active":e.instance.active}]}}}),Z={name:`TabPanel`,extends:{name:`BaseTabPanel`,extends:b,props:{value:{type:[String,Number],default:void 0},as:{type:[String,Object],default:`DIV`},asChild:{type:Boolean,default:!1},header:null,headerStyle:null,headerClass:null,headerProps:null,headerActionProps:null,contentStyle:null,contentClass:null,contentProps:null,disabled:Boolean},style:me,provide:function(){return{$pcTabPanel:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`],computed:{active:function(){return a(this.$pcTabs?.d_value,this.value)},id:function(){return`${this.$pcTabs?.$id}_tabpanel_${this.value}`},ariaLabelledby:function(){return`${this.$pcTabs?.$id}_tab_${this.value}`},attrs:function(){return N(this.a11yAttrs,this.ptmi(`root`,this.ptParams))},a11yAttrs:function(){return{id:this.id,tabindex:this.$pcTabs?.tabindex,role:`tabpanel`,"aria-labelledby":this.ariaLabelledby,"data-pc-name":`tabpanel`,"data-p-active":this.active}},ptParams:function(){return{context:{active:this.active}}}}};function he(e,r,i,a,s,u){var d,f;return u.$pcTabs?(y(),l(n,{key:1},[e.asChild?S(e.$slots,`default`,{key:1,class:t(e.cx(`root`)),active:u.active,a11yAttrs:u.a11yAttrs}):(y(),l(n,{key:0},[!((d=u.$pcTabs)!=null&&d.lazy)||u.active?L((y(),o(F(e.as),N({key:0,class:e.cx(`root`)},u.attrs),{default:A(function(){return[S(e.$slots,`default`)]}),_:3},16,[`class`])),[[R,(f=u.$pcTabs)!=null&&f.lazy?!0:u.active]]):c(``,!0)],64))],64)):S(e.$slots,`default`,{key:0})}Z.render=he;var ge={class:`page-acoes`},Q={__name:`BotoesExportar`,props:{arquivo:{type:String,required:!0},aba:{type:String,default:`Relatório`},header:{type:Array,required:!0},linhas:{type:Array,default:()=>[]},larguras:{type:Array,default:null}},setup(e){let t=e,n=z(),r=w(!1);function i(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}async function a(e){if(t.linhas.length){r.value=!0;try{let n=`${t.arquivo}_${i()}`;e===`csv`?ie(`${n}.csv`,t.header,t.linhas):await re(`${n}.xlsx`,t.aba,t.header,t.linhas,t.larguras)}catch(e){n.add({severity:`error`,summary:`Erro ao exportar`,detail:O(e),life:6e3})}finally{r.value=!1}}}return(t,n)=>(y(),l(`div`,ge,[_(D(M),{label:`CSV`,icon:`pi pi-file`,severity:`secondary`,outlined:``,disabled:!e.linhas.length,loading:r.value,onClick:n[0]||=e=>a(`csv`)},null,8,[`disabled`,`loading`]),_(D(M),{label:`Excel`,icon:`pi pi-file-excel`,severity:`secondary`,outlined:``,disabled:!e.linhas.length,loading:r.value,onClick:n[1]||=e=>a(`xlsx`)},null,8,[`disabled`,`loading`])]))}},_e={class:`toolbar`},ve={class:`page-sub`},ye={class:`card-panel tabela`},be={class:`prod-nome`},xe={class:`cat-texto`},Se={class:`num`},Ce={class:`muted`},we={__name:`RelConsumoPeriodo`,setup(e){let t=z(),r=[{label:`Consolidado`,value:null},{label:`PSM`,value:`PSM`},{label:`SAMU`,value:`SAMU`}];function a(){let e=new Date,t=new Date;return t.setDate(e.getDate()-6),[t,e]}let o=w(a()),s=w(null),c=w([]),u=w(!1),m=f(()=>{if(s.value)return c.value;let e=new Map;for(let t of c.value){let n=e.get(t.produto_id);n?n.quantidade+=Number(t.quantidade):e.set(t.produto_id,{...t,grupo:`PSM + SAMU`,quantidade:Number(t.quantidade)})}return[...e.values()].sort((e,t)=>e.produto.localeCompare(t.produto))}),h=f(()=>m.value.reduce((e,t)=>e+Number(t.quantidade),0)),g=[`Produto`,`Categoria`,`Unidade`,`Grupo`,`Quantidade`],b=f(()=>m.value.map(e=>[e.produto,H(e.categoria),e.unidade,e.grupo,Number(e.quantidade)]));function x(){o.value=a(),S()}async function S(){let[e,n]=o.value??[];if(!e||!n)return;u.value=!0;let{data:r,error:i}=await C.rpc(`consumo_periodo`,{p_inicio:I(e),p_fim:I(n),p_grupo:s.value});if(u.value=!1,i)return t.add({severity:`error`,summary:`Erro ao carregar consumo`,detail:O(i),life:6e3});c.value=r??[]}return v(S),(e,t)=>(y(),l(n,null,[p(`div`,_e,[_(D(U),{modelValue:o.value,"onUpdate:modelValue":[t[0]||=e=>o.value=e,t[1]||=e=>o.value?.[1]&&S()],"selection-mode":`range`,"date-format":`dd/mm/yy`,"show-icon":``,"manual-input":!1,placeholder:`Período`,"aria-label":`Período`},null,8,[`modelValue`]),_(D(M),{label:`Última semana`,icon:`pi pi-calendar`,severity:`secondary`,outlined:``,onClick:x}),_(D(W),{modelValue:s.value,"onUpdate:modelValue":[t[2]||=e=>s.value=e,S],options:r,"option-label":`label`,"option-value":`value`,"allow-empty":!1,"aria-label":`Grupo`},null,8,[`modelValue`]),t[3]||=p(`span`,{class:`grow`},null,-1),_(Q,{arquivo:`Consumo_periodo`,aba:`Consumo`,header:g,linhas:b.value,larguras:[34,14,10,12,11]},null,8,[`linhas`])]),p(`p`,ve,[t[4]||=i(`Só liberações para setores PSM/SAMU (estornos descontados). Total no período: `,-1),p(`strong`,null,d(h.value),1)]),p(`div`,ye,[_(D(B),{value:m.value,loading:u.value,paginator:``,rows:20,size:`small`,"removable-sort":``,class:`tabela-moderna`},{empty:A(()=>[...t[5]||=[i(`Nenhum consumo no período.`,-1)]]),default:A(()=>[_(D(V),{field:`produto`,header:`Produto`,sortable:``},{body:A(({data:e})=>[p(`span`,be,d(e.produto),1)]),_:1}),_(D(V),{field:`categoria`,header:`Categoria`,"header-class":`col-opc`,"body-class":`col-opc`},{body:A(({data:e})=>[p(`span`,xe,d(D(H)(e.categoria)),1)]),_:1}),_(D(V),{field:`grupo`,header:`Grupo`,sortable:``,style:{width:`8rem`}}),_(D(V),{field:`quantidade`,header:`Qtd`,sortable:``,style:{width:`6rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,Se,d(e.quantidade),1),t[6]||=i(),p(`span`,Ce,d(e.unidade),1)]),_:1})]),_:1},8,[`value`,`loading`])])],64))}},Te={class:`toolbar`},Ee={class:`card-panel tabela`},De={class:`prod-nome`},Oe={class:`num`},ke={key:0,class:`tag-estorno`},Ae={__name:`RelConsumoFuncionario`,setup(e){let t=z(),r=new Date,a=w([new Date(r.getFullYear(),r.getMonth(),1),r]),o=w([]),s=w(!1),u=[`Data`,`Funcionário`,`Produto`,`Unidade`,`Qtd`,`Observação`,`Entregue por`,`Estornada`],m=f(()=>o.value.map(e=>[new Date(e.data).toLocaleString(`pt-BR`),e.funcionario,e.produto,e.unidade_medida,e.quantidade,e.observacao||``,e.entregue_por||``,e.estornada?`Sim`:`Não`]));async function h(){let[e,n]=a.value??[];if(!e||!n)return;s.value=!0;let{data:r,error:i}=await C.from(`consumo_por_funcionario`).select(`*`).gte(`dia`,I(e)).lte(`dia`,I(n)).order(`data`,{ascending:!1});if(s.value=!1,i)return t.add({severity:`error`,summary:`Erro ao carregar`,detail:O(i),life:6e3});o.value=r??[]}return v(h),(e,t)=>(y(),l(n,null,[p(`div`,Te,[_(D(U),{modelValue:a.value,"onUpdate:modelValue":[t[0]||=e=>a.value=e,t[1]||=e=>a.value?.[1]&&h()],"selection-mode":`range`,"date-format":`dd/mm/yy`,"show-icon":``,"manual-input":!1,"aria-label":`Período`},null,8,[`modelValue`]),t[2]||=p(`span`,{class:`grow`},null,-1),_(Q,{arquivo:`Consumo_funcionarios`,aba:`Funcionários`,header:u,linhas:m.value,larguras:[18,26,34,10,7,30,18,10]},null,8,[`linhas`])]),p(`div`,Ee,[_(D(B),{value:o.value,loading:s.value,paginator:``,rows:20,size:`small`,"removable-sort":``,class:`tabela-moderna`},{empty:A(()=>[...t[3]||=[i(`Nenhuma entrega a funcionários no período.`,-1)]]),default:A(()=>[_(D(V),{field:`data`,header:`Data`,sortable:``,style:{width:`10rem`}},{body:A(({data:e})=>[i(d(new Date(e.data).toLocaleString(`pt-BR`,{dateStyle:`short`,timeStyle:`short`})),1)]),_:1}),_(D(V),{field:`funcionario`,header:`Funcionário`,sortable:``}),_(D(V),{field:`produto`,header:`Produto`,sortable:``},{body:A(({data:e})=>[p(`span`,De,d(e.produto),1)]),_:1}),_(D(V),{field:`quantidade`,header:`Qtd`,sortable:``,style:{width:`5rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,Oe,d(e.quantidade),1)]),_:1}),_(D(V),{header:`Situação`,style:{width:`8rem`},"header-class":`col-opc`,"body-class":`col-opc`},{body:A(({data:e})=>[e.estornada?(y(),l(`span`,ke,`Estornada`)):c(``,!0)]),_:1})]),_:1},8,[`value`,`loading`])])],64))}},je={class:`toolbar`},Me={class:`card-panel tabela`},Ne={class:`prod-nome`},Pe={class:`saldo baixo`},$={class:`num muted`},Fe={class:`num`},Ie={__name:`RelEstoqueCritico`,setup(e){let t=z(),r=w([]),a=w(!1),o=[`Produto`,`Categoria`,`Unidade`,`Mínimo`,`Disponível`,`Vencido`,`Falta`,`Situação`],s=f(()=>r.value.map(e=>[e.produto,H(e.categoria),e.unidade_medida,e.estoque_minimo,e.saldo_disponivel,e.saldo_vencido,e.falta,e.situacao===`zerado`?`Zerado`:`Crítico`]));return v(async()=>{a.value=!0;let{data:e,error:n}=await C.from(`estoque_critico`).select(`*`);if(a.value=!1,n)return t.add({severity:`error`,summary:`Erro ao carregar`,detail:O(n),life:6e3});r.value=e??[]}),(e,t)=>(y(),l(n,null,[p(`div`,je,[t[0]||=p(`p`,{class:`page-sub grow`},`Produtos com saldo disponível (sem lotes vencidos) igual ou abaixo do mínimo.`,-1),_(Q,{arquivo:`Estoque_critico`,aba:`Crítico`,header:o,linhas:s.value,larguras:[34,14,10,9,11,9,9,10]},null,8,[`linhas`])]),p(`div`,Me,[_(D(B),{value:r.value,loading:a.value,paginator:``,rows:20,size:`small`,"removable-sort":``,class:`tabela-moderna`},{empty:A(()=>[...t[1]||=[i(`Nenhum produto em nível crítico.`,-1)]]),default:A(()=>[_(D(V),{field:`produto`,header:`Produto`,sortable:``},{body:A(({data:e})=>[p(`span`,Ne,d(e.produto),1)]),_:1}),_(D(V),{field:`saldo_disponivel`,header:`Disponível`,sortable:``,style:{width:`7.5rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,Pe,d(e.saldo_disponivel),1)]),_:1}),_(D(V),{field:`estoque_minimo`,header:`Mínimo`,sortable:``,style:{width:`6.5rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,$,d(e.estoque_minimo),1)]),_:1}),_(D(V),{field:`falta`,header:`Falta`,sortable:``,style:{width:`6rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,Fe,d(e.falta),1)]),_:1}),_(D(V),{field:`situacao`,header:`Situação`,style:{width:`7rem`}},{body:A(({data:e})=>[i(d(e.situacao===`zerado`?`Zerado`:`Crítico`),1)]),_:1})]),_:1},8,[`value`,`loading`])])],64))}},Le={class:`toolbar`},Re={class:`card-panel tabela`},ze={class:`prod-nome`},Be={class:`mono`},Ve={class:`muted`},He={class:`num`},Ue={__name:`RelValidade`,setup(e){let r=z(),a=[{label:`30 dias`,value:30},{label:`60 dias`,value:60},{label:`90 dias`,value:90}],o=w(30),s=w([]),c=w(!1),u=[`Produto`,`Lote`,`Validade`,`Dias restantes`,`Saldo`,`Situação`],m=f(()=>s.value.map(e=>[e.produto,e.numero_lote||``,P(e.validade),e.dias_restantes,e.saldo,e.vencido?`Vencido`:`A vencer`]));async function h(){c.value=!0;let{data:e,error:t}=await C.rpc(`alerta_validade_dias`,{p_dias:o.value});if(c.value=!1,t)return r.add({severity:`error`,summary:`Erro ao carregar`,detail:O(t),life:6e3});s.value=e??[]}return v(h),(e,r)=>(y(),l(n,null,[p(`div`,Le,[_(D(W),{modelValue:o.value,"onUpdate:modelValue":[r[0]||=e=>o.value=e,h],options:a,"option-label":`label`,"option-value":`value`,"allow-empty":!1,"aria-label":`Janela de validade`},null,8,[`modelValue`]),r[1]||=p(`span`,{class:`grow`},null,-1),_(Q,{arquivo:`Validade`,aba:`Validade`,header:u,linhas:m.value,larguras:[34,14,12,14,8,11]},null,8,[`linhas`])]),p(`div`,Re,[_(D(B),{value:s.value,loading:c.value,paginator:``,rows:20,size:`small`,"removable-sort":``,class:`tabela-moderna`},{empty:A(()=>[...r[2]||=[i(`Nenhum lote vence nessa janela.`,-1)]]),default:A(()=>[_(D(V),{field:`produto`,header:`Produto`,sortable:``},{body:A(({data:e})=>[p(`span`,ze,d(e.produto),1)]),_:1}),_(D(V),{field:`numero_lote`,header:`Lote`,style:{width:`9rem`}},{body:A(({data:e})=>[p(`span`,Be,d(e.numero_lote||`sem nº`),1)]),_:1}),_(D(V),{field:`validade`,header:`Validade`,sortable:``,style:{width:`11rem`}},{body:A(({data:e})=>[p(`span`,{class:t([`validade`,e.vencido?`vencido`:`proximo`])},d(D(P)(e.validade)),3),p(`small`,Ve,` · `+d(e.vencido?`vencido`:`em ${e.dias_restantes} d`),1)]),_:1}),_(D(V),{field:`saldo`,header:`Saldo`,sortable:``,style:{width:`6rem`},"header-class":`col-num`,"body-class":`col-num`},{body:A(({data:e})=>[p(`span`,He,d(e.saldo),1)]),_:1})]),_:1},8,[`value`,`loading`])])],64))}},We={__name:`Relatorios`,setup(e){let t=w(`consumo`);return(e,r)=>(y(),l(n,null,[r[5]||=p(`div`,{class:`page-head`},[p(`div`,null,[p(`h1`,null,`Relatórios`),p(`p`,{class:`page-sub`},`Consumo, funcionários, estoque crítico e validade`)])],-1),_(D(G),{value:t.value,"onUpdate:value":r[0]||=e=>t.value=e,lazy:``},{default:A(()=>[_(D(q),null,{default:A(()=>[_(D(Y),{value:`consumo`},{default:A(()=>[...r[1]||=[i(`Consumo`,-1)]]),_:1}),_(D(Y),{value:`funcionarios`},{default:A(()=>[...r[2]||=[i(`Por funcionário`,-1)]]),_:1}),_(D(Y),{value:`critico`},{default:A(()=>[...r[3]||=[i(`Estoque crítico`,-1)]]),_:1}),_(D(Y),{value:`validade`},{default:A(()=>[...r[4]||=[i(`Validade`,-1)]]),_:1})]),_:1}),_(D(X),null,{default:A(()=>[_(D(Z),{value:`consumo`},{default:A(()=>[_(we)]),_:1}),_(D(Z),{value:`funcionarios`},{default:A(()=>[_(Ae)]),_:1}),_(D(Z),{value:`critico`},{default:A(()=>[_(Ie)]),_:1}),_(D(Z),{value:`validade`},{default:A(()=>[_(Ue)]),_:1})]),_:1})]),_:1},8,[`value`])],64))}};export{We as default};