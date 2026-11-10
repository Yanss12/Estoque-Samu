import{$t as e,At as t,F as n,Fn as r,Ht as i,On as a,Ot as o,Q as s,Sn as c,W as l,Yn as u,Yt as d,at as f,ct as p,en as m,fn as h,gn as g,i as _,jn as v,jt as y,k as b,kn as x,nn as S,o as C,on as w,rt as T,t as E,tn as D,ut as O,vt as k,xn as A,yn as j}from"./button-BFPN1M7R.js";import{E as ee,M}from"./index-qdRwIPSK.js";import{t as N}from"./chevronright-CgM7P1lu.js";import{n as P}from"./datepicker-BHgblOiu.js";import{n as F,t as I}from"./relatorioExcel-C60ePGHY.js";var L=n.extend({name:`tabs`,style:`
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
`,classes:{root:function(e){return[`p-tabs p-component`,{"p-tabs-scrollable":e.props.scrollable}]}}}),R={name:`Tabs`,extends:{name:`BaseTabs`,extends:C,props:{value:{type:[String,Number],default:void 0},lazy:{type:Boolean,default:!1},scrollable:{type:Boolean,default:!1},showNavigators:{type:Boolean,default:!0},tabindex:{type:Number,default:0},selectOnFocus:{type:Boolean,default:!1}},style:L,provide:function(){return{$pcTabs:this,$parentInstance:this}}},inheritAttrs:!1,emits:[`update:value`],data:function(){return{d_value:this.value}},watch:{value:function(e){this.d_value=e}},methods:{updateValue:function(e){this.d_value!==e&&(this.d_value=e,this.$emit(`update:value`,e))},isVertical:function(){return this.orientation===`vertical`}}};function z(e,t,n,r,i,a){return g(),S(`div`,h({class:e.cx(`root`)},e.ptmi(`root`)),[j(e.$slots,`default`)],16)}R.render=z;var B={name:`TabList`,extends:{name:`BaseTabList`,extends:C,props:{},style:n.extend({name:`tablist`,classes:{root:`p-tablist`,content:`p-tablist-content p-tablist-viewport`,tabList:`p-tablist-tab-list`,activeBar:`p-tablist-active-bar`,prevButton:`p-tablist-prev-button p-tablist-nav-button`,nextButton:`p-tablist-next-button p-tablist-nav-button`}}),provide:function(){return{$pcTabList:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`],data:function(){return{isPrevButtonEnabled:!1,isNextButtonEnabled:!0}},resizeObserver:void 0,inkBarObserver:void 0,watch:{showNavigators:function(e){e?this.bindResizeObserver():this.unbindResizeObserver()},activeValue:{flush:`post`,handler:function(){this.updateInkBar(),this.bindInkBarObserver()}}},mounted:function(){var e=this;setTimeout(function(){e.updateInkBar(),e.bindInkBarObserver()},150),this.showNavigators&&(this.updateButtonState(),this.bindResizeObserver())},updated:function(){this.showNavigators&&this.updateButtonState()},beforeUnmount:function(){this.unbindResizeObserver(),this.unbindInkBarObserver()},methods:{onScroll:function(e){this.showNavigators&&this.updateButtonState(),e.preventDefault()},onPrevButtonClick:function(){var e=this.$refs.content,t=this.getVisibleButtonWidths(),n=f(e)-t,r=Math.abs(e.scrollLeft)-n*.8,i=Math.max(r,0);e.scrollLeft=O(e)?-1*i:i},onNextButtonClick:function(){var e=this.$refs.content,t=this.getVisibleButtonWidths(),n=f(e)-t,r=Math.abs(e.scrollLeft)+n*.8,i=e.scrollWidth-n,a=Math.min(r,i);e.scrollLeft=O(e)?-1*a:a},bindResizeObserver:function(){var e=this;this.resizeObserver=new ResizeObserver(function(){return e.updateButtonState()}),this.resizeObserver.observe(this.$refs.list)},unbindResizeObserver:function(){var e;(e=this.resizeObserver)==null||e.unobserve(this.$refs.list),this.resizeObserver=void 0},bindInkBarObserver:function(){var e=this;this.unbindInkBarObserver();var n=this.$refs.content,r=t(n,`[data-pc-name="tab"][data-p-active="true"]`);r&&(this.inkBarObserver=new ResizeObserver(function(){return e.updateInkBar()}),this.inkBarObserver.observe(r))},unbindInkBarObserver:function(){var e;(e=this.inkBarObserver)==null||e.disconnect(),this.inkBarObserver=void 0},updateInkBar:function(){var e=this.$refs,n=e.content,r=e.inkbar,i=e.tabs;if(r){var a=t(n,`[data-pc-name="tab"][data-p-active="true"]`);this.$pcTabs.isVertical()?(r.style.height=l(a)+`px`,r.style.top=s(a).top-s(i).top+`px`):(r.style.width=o(a)+`px`,r.style.left=s(a).left-s(i).left+`px`)}},updateButtonState:function(){var e=this.$refs,t=e.list,n=e.content,r=n.scrollTop,i=n.scrollWidth,a=n.scrollHeight,o=n.offsetWidth,s=n.offsetHeight,c=Math.abs(n.scrollLeft),l=[f(n),p(n)],u=l[0],d=l[1];this.$pcTabs.isVertical()?(this.isPrevButtonEnabled=r!==0,this.isNextButtonEnabled=t.offsetHeight>=s&&parseInt(r)!==a-d):(this.isPrevButtonEnabled=c!==0,this.isNextButtonEnabled=t.offsetWidth>=o&&parseInt(c)!==i-u)},getVisibleButtonWidths:function(){var e=this.$refs,t=e.prevButton,n=e.nextButton,r=0;return this.showNavigators&&(r=(t?.offsetWidth||0)+(n?.offsetWidth||0)),r}},computed:{templates:function(){return this.$pcTabs.$slots},activeValue:function(){return this.$pcTabs.d_value},showNavigators:function(){return this.$pcTabs.showNavigators},prevButtonAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.previous:void 0},nextButtonAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.next:void 0},dataP:function(){return y({scrollable:this.$pcTabs.scrollable})}},components:{ChevronLeftIcon:P,ChevronRightIcon:N},directives:{ripple:_}},V=[`data-p`],H=[`aria-label`,`tabindex`],U=[`data-p`],W=[`aria-orientation`],G=[`aria-label`,`tabindex`];function K(t,n,r,i,a,o){var s=A(`ripple`);return g(),S(`div`,h({ref:`list`,class:t.cx(`root`),"data-p":o.dataP},t.ptmi(`root`)),[o.showNavigators&&a.isPrevButtonEnabled?x((g(),S(`button`,h({key:0,ref:`prevButton`,type:`button`,class:t.cx(`prevButton`),"aria-label":o.prevButtonAriaLabel,tabindex:o.$pcTabs.tabindex,onClick:n[0]||=function(){return o.onPrevButtonClick&&o.onPrevButtonClick.apply(o,arguments)}},t.ptm(`prevButton`),{"data-pc-group-section":`navigator`}),[(g(),m(c(o.templates.previcon||`ChevronLeftIcon`),h({"aria-hidden":`true`},t.ptm(`prevIcon`)),null,16))],16,H)),[[s]]):D(``,!0),e(`div`,h({ref:`content`,class:t.cx(`content`),onScroll:n[1]||=function(){return o.onScroll&&o.onScroll.apply(o,arguments)},"data-p":o.dataP},t.ptm(`content`)),[e(`div`,h({ref:`tabs`,class:t.cx(`tabList`),role:`tablist`,"aria-orientation":o.$pcTabs.orientation||`horizontal`},t.ptm(`tabList`)),[j(t.$slots,`default`),e(`span`,h({ref:`inkbar`,class:t.cx(`activeBar`),role:`presentation`,"aria-hidden":`true`},t.ptm(`activeBar`)),null,16)],16,W)],16,U),o.showNavigators&&a.isNextButtonEnabled?x((g(),S(`button`,h({key:1,ref:`nextButton`,type:`button`,class:t.cx(`nextButton`),"aria-label":o.nextButtonAriaLabel,tabindex:o.$pcTabs.tabindex,onClick:n[2]||=function(){return o.onNextButtonClick&&o.onNextButtonClick.apply(o,arguments)}},t.ptm(`nextButton`),{"data-pc-group-section":`navigator`}),[(g(),m(c(o.templates.nexticon||`ChevronRightIcon`),h({"aria-hidden":`true`},t.ptm(`nextIcon`)),null,16))],16,G)),[[s]]):D(``,!0)],16,V)}B.render=K;var q=n.extend({name:`tab`,classes:{root:function(e){var t=e.instance,n=e.props;return[`p-tab`,{"p-tab-active":t.active,"p-disabled":n.disabled}]}}}),J={name:`Tab`,extends:{name:`BaseTab`,extends:C,props:{value:{type:[String,Number],default:void 0},disabled:{type:Boolean,default:!1},as:{type:[String,Object],default:`BUTTON`},asChild:{type:Boolean,default:!1}},style:q,provide:function(){return{$pcTab:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`,`$pcTabList`],methods:{onFocus:function(){this.$pcTabs.selectOnFocus&&this.changeActiveValue()},onClick:function(){this.changeActiveValue()},onKeydown:function(e){switch(e.code){case`ArrowRight`:this.onArrowRightKey(e);break;case`ArrowLeft`:this.onArrowLeftKey(e);break;case`Home`:this.onHomeKey(e);break;case`End`:this.onEndKey(e);break;case`PageDown`:this.onPageDownKey(e);break;case`PageUp`:this.onPageUpKey(e);break;case`Enter`:case`NumpadEnter`:case`Space`:this.onEnterKey(e);break}},onArrowRightKey:function(e){var t=this.findNextTab(e.currentTarget);t?this.changeFocusedTab(e,t):this.onHomeKey(e),e.preventDefault()},onArrowLeftKey:function(e){var t=this.findPrevTab(e.currentTarget);t?this.changeFocusedTab(e,t):this.onEndKey(e),e.preventDefault()},onHomeKey:function(e){var t=this.findFirstTab();this.changeFocusedTab(e,t),e.preventDefault()},onEndKey:function(e){var t=this.findLastTab();this.changeFocusedTab(e,t),e.preventDefault()},onPageDownKey:function(e){this.scrollInView(this.findLastTab()),e.preventDefault()},onPageUpKey:function(e){this.scrollInView(this.findFirstTab()),e.preventDefault()},onEnterKey:function(e){this.changeActiveValue()},findNextTab:function(e){var n=arguments.length>1&&arguments[1]!==void 0&&arguments[1]?e:e.nextElementSibling;return n?T(n,`data-p-disabled`)||T(n,`data-pc-section`)===`activebar`?this.findNextTab(n):t(n,`[data-pc-name="tab"]`):null},findPrevTab:function(e){var n=arguments.length>1&&arguments[1]!==void 0&&arguments[1]?e:e.previousElementSibling;return n?T(n,`data-p-disabled`)||T(n,`data-pc-section`)===`activebar`?this.findPrevTab(n):t(n,`[data-pc-name="tab"]`):null},findFirstTab:function(){return this.findNextTab(this.$pcTabList.$refs.tabs.firstElementChild,!0)},findLastTab:function(){return this.findPrevTab(this.$pcTabList.$refs.tabs.lastElementChild,!0)},changeActiveValue:function(){this.$pcTabs.updateValue(this.value)},changeFocusedTab:function(e,t){k(t),this.scrollInView(t)},scrollInView:function(e){var t;e==null||(t=e.scrollIntoView)==null||t.call(e,{block:`nearest`})}},computed:{active:function(){return i(this.$pcTabs?.d_value,this.value)},id:function(){return`${this.$pcTabs?.$id}_tab_${this.value}`},ariaControls:function(){return`${this.$pcTabs?.$id}_tabpanel_${this.value}`},attrs:function(){return h(this.asAttrs,this.a11yAttrs,this.ptmi(`root`,this.ptParams))},asAttrs:function(){return this.as===`BUTTON`?{type:`button`,disabled:this.disabled}:void 0},a11yAttrs:function(){return{id:this.id,tabindex:this.active?this.$pcTabs.tabindex:-1,role:`tab`,"aria-selected":this.active,"aria-controls":this.ariaControls,"data-pc-name":`tab`,"data-p-disabled":this.disabled,"data-p-active":this.active,onFocus:this.onFocus,onKeydown:this.onKeydown}},ptParams:function(){return{context:{active:this.active}}},dataP:function(){return y({active:this.active})}},directives:{ripple:_}};function Y(e,t,n,r,i,o){var s=A(`ripple`);return e.asChild?j(e.$slots,`default`,{key:1,dataP:o.dataP,class:u(e.cx(`root`)),active:o.active,a11yAttrs:o.a11yAttrs,onClick:o.onClick}):x((g(),m(c(e.as),h({key:0,class:e.cx(`root`),"data-p":o.dataP,onClick:o.onClick},o.attrs),{default:a(function(){return[j(e.$slots,`default`)]}),_:3},16,[`class`,`data-p`,`onClick`])),[[s]])}J.render=Y;var X={name:`TabPanels`,extends:{name:`BaseTabPanels`,extends:C,props:{},style:n.extend({name:`tabpanels`,classes:{root:`p-tabpanels`}}),provide:function(){return{$pcTabPanels:this,$parentInstance:this}}},inheritAttrs:!1};function Z(e,t,n,r,i,a){return g(),S(`div`,h({class:e.cx(`root`),role:`presentation`},e.ptmi(`root`)),[j(e.$slots,`default`)],16)}X.render=Z;var Q=n.extend({name:`tabpanel`,classes:{root:function(e){return[`p-tabpanel`,{"p-tabpanel-active":e.instance.active}]}}}),$={name:`TabPanel`,extends:{name:`BaseTabPanel`,extends:C,props:{value:{type:[String,Number],default:void 0},as:{type:[String,Object],default:`DIV`},asChild:{type:Boolean,default:!1},header:null,headerStyle:null,headerClass:null,headerProps:null,headerActionProps:null,contentStyle:null,contentClass:null,contentProps:null,disabled:Boolean},style:Q,provide:function(){return{$pcTabPanel:this,$parentInstance:this}}},inheritAttrs:!1,inject:[`$pcTabs`],computed:{active:function(){return i(this.$pcTabs?.d_value,this.value)},id:function(){return`${this.$pcTabs?.$id}_tabpanel_${this.value}`},ariaLabelledby:function(){return`${this.$pcTabs?.$id}_tab_${this.value}`},attrs:function(){return h(this.a11yAttrs,this.ptmi(`root`,this.ptParams))},a11yAttrs:function(){return{id:this.id,tabindex:this.$pcTabs?.tabindex,role:`tabpanel`,"aria-labelledby":this.ariaLabelledby,"data-pc-name":`tabpanel`,"data-p-active":this.active}},ptParams:function(){return{context:{active:this.active}}}}};function te(e,t,n,r,i,o){var s,l;return o.$pcTabs?(g(),S(d,{key:1},[e.asChild?j(e.$slots,`default`,{key:1,class:u(e.cx(`root`)),active:o.active,a11yAttrs:o.a11yAttrs}):(g(),S(d,{key:0},[!((s=o.$pcTabs)!=null&&s.lazy)||o.active?x((g(),m(c(e.as),h({key:0,class:e.cx(`root`)},o.attrs),{default:a(function(){return[j(e.$slots,`default`)]}),_:3},16,[`class`])),[[M,(l=o.$pcTabs)!=null&&l.lazy?!0:o.active]]):D(``,!0)],64))],64)):j(e.$slots,`default`,{key:0})}$.render=te;var ne={class:`page-acoes`},re={__name:`BotoesExportar`,props:{arquivo:{type:String,required:!0},aba:{type:String,default:`Relatório`},header:{type:Array,required:!0},linhas:{type:Array,default:()=>[]},larguras:{type:Array,default:null}},setup(e){let t=e,n=ee(),i=v(!1);function a(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}async function o(e){if(t.linhas.length){i.value=!0;try{let n=`${t.arquivo}_${a()}`;e===`csv`?I(`${n}.csv`,t.header,t.linhas):await F(`${n}.xlsx`,t.aba,t.header,t.linhas,t.larguras)}catch(e){n.add({severity:`error`,summary:`Erro ao exportar`,detail:b(e),life:6e3})}finally{i.value=!1}}}return(t,n)=>(g(),S(`div`,ne,[w(r(E),{label:`CSV`,icon:`pi pi-file`,severity:`secondary`,outlined:``,disabled:!e.linhas.length,loading:i.value,onClick:n[0]||=e=>o(`csv`)},null,8,[`disabled`,`loading`]),w(r(E),{label:`Excel`,icon:`pi pi-file-excel`,severity:`secondary`,outlined:``,disabled:!e.linhas.length,loading:i.value,onClick:n[1]||=e=>o(`xlsx`)},null,8,[`disabled`,`loading`])]))}};export{B as a,J as i,$ as n,R as o,X as r,re as t};