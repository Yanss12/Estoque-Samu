import{It as e,Lt as t,Nn as n,Nt as r,Pt as i,Vt as a,Zt as o,ft as s,g as c,gn as l,o as u,qt as d}from"./format-BwPmLEL_.js";import{a as f,t as p}from"./index-B41DnV3P.js";import{n as m}from"./chevronright-DOK9l2eG.js";var h=c.extend({name:`textarea`,style:`
    .p-textarea {
        font-family: inherit;
        font-feature-settings: inherit;
        font-size: 1rem;
        color: dt('textarea.color');
        background: dt('textarea.background');
        padding-block: dt('textarea.padding.y');
        padding-inline: dt('textarea.padding.x');
        border: 1px solid dt('textarea.border.color');
        transition:
            background dt('textarea.transition.duration'),
            color dt('textarea.transition.duration'),
            border-color dt('textarea.transition.duration'),
            outline-color dt('textarea.transition.duration'),
            box-shadow dt('textarea.transition.duration');
        appearance: none;
        border-radius: dt('textarea.border.radius');
        outline-color: transparent;
        box-shadow: dt('textarea.shadow');
    }

    .p-textarea:enabled:hover {
        border-color: dt('textarea.hover.border.color');
    }

    .p-textarea:enabled:focus {
        border-color: dt('textarea.focus.border.color');
        box-shadow: dt('textarea.focus.ring.shadow');
        outline: dt('textarea.focus.ring.width') dt('textarea.focus.ring.style') dt('textarea.focus.ring.color');
        outline-offset: dt('textarea.focus.ring.offset');
    }

    .p-textarea.p-invalid {
        border-color: dt('textarea.invalid.border.color');
    }

    .p-textarea.p-variant-filled {
        background: dt('textarea.filled.background');
    }

    .p-textarea.p-variant-filled:enabled:hover {
        background: dt('textarea.filled.hover.background');
    }

    .p-textarea.p-variant-filled:enabled:focus {
        background: dt('textarea.filled.focus.background');
    }

    .p-textarea:disabled {
        opacity: 1;
        background: dt('textarea.disabled.background');
        color: dt('textarea.disabled.color');
    }

    .p-textarea::placeholder {
        color: dt('textarea.placeholder.color');
    }

    .p-textarea.p-invalid::placeholder {
        color: dt('textarea.invalid.placeholder.color');
    }

    .p-textarea-fluid {
        width: 100%;
    }

    .p-textarea-resizable {
        overflow: hidden;
        resize: none;
    }

    .p-textarea-sm {
        font-size: dt('textarea.sm.font.size');
        padding-block: dt('textarea.sm.padding.y');
        padding-inline: dt('textarea.sm.padding.x');
    }

    .p-textarea-lg {
        font-size: dt('textarea.lg.font.size');
        padding-block: dt('textarea.lg.padding.y');
        padding-inline: dt('textarea.lg.padding.x');
    }
`,classes:{root:function(e){var t=e.instance,n=e.props;return[`p-textarea p-component`,{"p-filled":t.$filled,"p-textarea-resizable ":n.autoResize,"p-textarea-sm p-inputfield-sm":n.size===`small`,"p-textarea-lg p-inputfield-lg":n.size===`large`,"p-invalid":t.$invalid,"p-variant-filled":t.$variant===`filled`,"p-textarea-fluid":t.$fluid}]}}}),g={name:`BaseTextarea`,extends:f,props:{autoResize:Boolean},style:h,provide:function(){return{$pcTextarea:this,$parentInstance:this}}};function _(e){"@babel/helpers - typeof";return _=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},_(e)}function v(e,t,n){return(t=y(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function y(e){var t=b(e,`string`);return _(t)==`symbol`?t:t+``}function b(e,t){if(_(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(_(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var x={name:`Textarea`,extends:g,inheritAttrs:!1,observer:null,mounted:function(){var e=this;this.autoResize&&(this.observer=new ResizeObserver(function(){requestAnimationFrame(function(){e.resize()})}),this.observer.observe(this.$el))},updated:function(){this.autoResize&&this.resize()},beforeUnmount:function(){this.observer&&this.observer.disconnect()},methods:{resize:function(){if(this.$el.offsetParent){var e=this.$el.style.height,t=parseInt(e)||0,n=this.$el.scrollHeight;t&&n<t?(this.$el.style.height=`auto`,this.$el.style.height=`${this.$el.scrollHeight}px`):(!t||n>t)&&(this.$el.style.height=`${n}px`)}},onInput:function(e){this.autoResize&&this.resize(),this.writeValue(e.target.value,e)}},computed:{attrs:function(){return d(this.ptmi(`root`,{context:{filled:this.$filled,disabled:this.disabled}}),this.formField)},dataP:function(){return s(v({invalid:this.$invalid,fluid:this.$fluid,filled:this.$variant===`filled`},this.size,this.size))}}},S=[`value`,`name`,`disabled`,`aria-invalid`,`data-p`];function C(e,n,r,i,a,s){return o(),t(`textarea`,d({class:e.cx(`root`),value:e.d_value,name:e.name,disabled:e.disabled,"aria-invalid":e.invalid||void 0,"data-p":s.dataP,onInput:n[0]||=function(){return s.onInput&&s.onInput.apply(s,arguments)}},s.attrs),null,16,S)}x.render=C;var w={key:0,class:`pager`},T={class:`pager-info`},E={class:`pager-ctrl`},D=p({__name:`Paginador`,props:{first:{type:Number,default:0},rows:{type:Number,default:25},total:{type:Number,default:0},rowsOptions:{type:Array,default:()=>[25,50,100]},disabled:{type:Boolean,default:!1}},emits:[`update:first`,`update:rows`],setup(s,{emit:c}){let d=s,f=c,p=r(()=>d.total===0?0:d.first+1),h=r(()=>Math.min(d.first+d.rows,d.total)),g=r(()=>d.first>0),_=r(()=>h.value<d.total);function v(){f(`update:first`,Math.max(0,d.first-d.rows))}function y(){f(`update:first`,d.first+d.rows)}function b(e){f(`update:rows`,e),f(`update:first`,0)}return(r,c)=>s.total?(o(),t(`div`,w,[i(`span`,T,n(p.value)+`–`+n(h.value)+` de `+n(s.total),1),i(`div`,E,[c[0]||=i(`span`,{class:`pager-lbl`},`por página`,-1),a(l(m),{"model-value":s.rows,options:s.rowsOptions,style:{width:`5.5rem`},"onUpdate:modelValue":b},null,8,[`model-value`,`options`]),a(l(u),{icon:`pi pi-angle-left`,text:``,rounded:``,severity:`secondary`,disabled:!g.value||s.disabled,onClick:v},null,8,[`disabled`]),a(l(u),{icon:`pi pi-angle-right`,text:``,rounded:``,severity:`secondary`,disabled:!_.value||s.disabled,onClick:y},null,8,[`disabled`])])])):e(``,!0)}},[[`__scopeId`,`data-v-26475f1d`]]);export{x as n,D as t};