// Extend menu and autocomplete widgets
// to play nicely with Webkit on iOS
(function($) {
  $.widget("ui.VSmenu", $.extend({}, $.ui.menu.prototype, {
    _init: function() {
      this.element.data('menu', this.element.data('VSmenu'));
      return $.ui.menu.prototype._init.apply(this, arguments);
    },

    select: function( event ) {
      this.options.selected(event, { item: this.active });
    }
  }));

  $.widget("ui.VSautocomplete", $.extend({}, $.ui.autocomplete.prototype, {
    _init: function() {
      this.element.data('autocomplete', this.element.data('VSautocomplete'));
      return $.ui.autocomplete.prototype._init.apply(this, arguments);
    },

    _create: function() {
      var self = this,
        doc = this.element[ 0 ].ownerDocument,
        suppressKeyPress;

      this.element
        .addClass( "ui-autocomplete-input" )
        .attr( "autocomplete", "off" )
        // TODO verify these actually work as intended
        .attr({
          role: "textbox",
          "aria-autocomplete": "list",
          "aria-haspopup": "true"
        })
        .bind( "keydown.autocomplete", function( event ) {
          if ( self.options.disabled || self.element.attr( "readonly" ) ) {
            return;
          }

          suppressKeyPress = false;
          var keyCode = $.ui.keyCode;
          switch( event.keyCode ) {
          case keyCode.PAGE_UP:
            self._move( "previousPage", event );
            break;
          case keyCode.PAGE_DOWN:
            self._move( "nextPage", event );
            break;
          case keyCode.UP:
            self._move( "previous", event );
            // prevent moving cursor to beginning of text field in some browsers
            event.preventDefault();
            break;
          case keyCode.DOWN:
            self._move( "next", event );
            // prevent moving cursor to end of text field in some browsers
            event.preventDefault();
            break;
          case keyCode.ENTER:
          case keyCode.NUMPAD_ENTER:
            // when menu is open and has focus
            if ( self.menu.active ) {
              // #6055 - Opera still allows the keypress to occur
              // which causes forms to submit
              suppressKeyPress = true;
              event.preventDefault();
            }
            //passthrough - ENTER and TAB both select the current element
          case keyCode.TAB:
            if ( !self.menu.active ) {
              return;
            }
            self.menu.select( event );
            break;
          case keyCode.ESCAPE:
            self.element.val( self.term );
            self.close( event );
            break;
          default:
            // keypress is triggered before the input value is changed
            clearTimeout( self.searching );
            self.searching = setTimeout(function() {
              // only search if the value has changed
              if ( self.term != self.element.val() ) {
                self.selectedItem = null;
                self.search( null, event );
              }
            }, self.options.delay );
            break;
          }
        })
        .bind( "keypress.autocomplete", function( event ) {
          if ( suppressKeyPress ) {
            suppressKeyPress = false;
            event.preventDefault();
          }
        })
        .bind( "focus.autocomplete", function() {
          if ( self.options.disabled ) {
            return;
          }

          self.selectedItem = null;
          self.previous = self.element.val();
        })
        .bind( "blur.autocomplete", function( event ) {
          if ( self.options.disabled ) {
            return;
          }

          clearTimeout( self.searching );
          // clicks on the menu (or a button to trigger a search) will cause a blur event
          self.closing = setTimeout(function() {
            self.close( event );
            self._change( event );
          }, 150 );
        });
      this._initSource();
      this.response = function() {
        return self._response.apply( self, arguments );
      };
      this.menu = $( "<ul></ul>" )
        .addClass( "ui-autocomplete" )
        .appendTo( $( this.options.appendTo || "body", doc )[0] )
        // prevent the close-on-blur in case of a "slow" click on the menu (long mousedown)
        .mousedown(function( event ) {
          // clicking on the scrollbar causes focus to shift to the body
          // but we can't detect a mouseup or a click immediately afterward
          // so we have to track the next mousedown and close the menu if
          // the user clicks somewhere outside of the autocomplete
          var menuElement = self.menu.element[ 0 ];
          if ( !$( event.target ).closest( ".ui-menu-item" ).length ) {
            setTimeout(function() {
              $( document ).one( 'mousedown', function( event ) {
                if ( event.target !== self.element[ 0 ] &&
                  event.target !== menuElement &&
                  !$.ui.contains( menuElement, event.target ) ) {
                  self.close();
                }
              });
            }, 1 );
          }

          // use another timeout to make sure the blur-event-handler on the input was already triggered
          setTimeout(function() {
            clearTimeout( self.closing );
          }, 13);
        })
        .VSmenu({
          focus: function( event, ui ) {
            var item = ui.item.data( "item.autocomplete" );
            if ( false !== self._trigger( "focus", event, { item: item } ) ) {
              // use value to match what will end up in the input, if it was a key event
              if ( /^key/.test(event.originalEvent.type) ) {
                self.element.val( item.value );
              }
            }
          },
          selected: function( event, ui ) {
            var item = ui.item.data( "item.autocomplete" ),
              previous = self.previous;

            // only trigger when focus was lost (click on menu)
            if ( self.element[0] !== doc.activeElement ) {
              self.previous = previous;
              // #6109 - IE triggers two focus events and the second
              // is asynchronous, so we need to reset the previous
              // term synchronously and asynchronously :-(
              setTimeout(function() {
                self.previous = previous;
                self.selectedItem = item;
              }, 1);
            }

            //console.log(self);
            //if ( false !== self._trigger( "select", event, { item: item } ) ) {
            //	self.element.val( item.value );
            //}
            if ( false !== self.options.select(event, { item: item } ) ) {
              self.element.val( item.value );
            }

            // reset the term after the select event
            // this allows custom select handling to work properly
            self.term = self.element.val();

            self.close( event );
            self.selectedItem = item;

          },
          blur: function( event, ui ) {
            // don't set the value of the text field if it's already correct
            // this prevents moving the cursor unnecessarily
            if ( self.menu.element.is(":visible") &&
              ( self.element.val() !== self.term ) ) {
              self.element.val( self.term );
            }
          }
        })
        .zIndex( this.element.zIndex() + 1 )
        // workaround for jQuery bug #5781 http://dev.jquery.com/ticket/5781
        .css({ top: 0, left: 0 })
        .hide()
        .data( "VSmenu" );
      if ( $.fn.bgiframe ) {
         this.menu.element.bgiframe();
      }
    }
  }));
})(jQuery);
