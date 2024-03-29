import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


class StreamControllerExtension extends Extension {
    enable() {
        console.error('Extension enabled 889900');
        this._focusChangedSignalId = global.display.connect('notify::focus-window', this._onFocusWindowChanged.bind(this));

        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(`
            <node>
            <interface name='org.gnome.Shell.Extensions.StreamController'>
            <method name='GetFocusedWindow'>
                <arg type='s' name='window' direction='out'/>
            </method>
            <method name='GetAllWindows'>
                <arg type='s' name='window' direction='out'/>
            </method>
            <signal name='FocusedWindowChanged'>
                <arg type='s' name='new_window_name'/>
            </signal>
            <!-- Other methods and signals -->
            </interface>
        </node>`, this);
        this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/StreamController');
        console.error('Extension enabled 889900');
        this._currentTitle = null;
        this._currentWMClass = null;
    }

    disable() {
        if (this._focusChangedSignalId) {
            global.display.disconnect(this._focusChangedSignalId);
            this._focusChangedSignalId = null;
        }

        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }

        this.handlerId = null;
    }

    GetFocusedWindow() {
        var result = {
            wm_class : this._currentWMClass,
            title : this._currentTitle
        }
        return JSON.stringify(result);
    }

    GetAllWindows() {
        const windows = global.get_window_actors();

        let window_list = [];
        for (const window of windows) {
            window_list.push({
                wm_class : window.meta_window.get_wm_class(),
                title : window.meta_window.get_title()
            });
        }
    
        return JSON.stringify(window_list);
    }

    _onFocusWindowChanged() {
        let focusedWindow = global.display.focus_window;
        let title = focusedWindow ? focusedWindow.get_title() : null;
        let wmClass = focusedWindow ? focusedWindow.get_wm_class() : null;
        // Main.notify("changed", "changed");
        // this._dbusImpl.emit_signal('FocusedWindowChanged', new GLib.Variant('(s)', [wmClass, title]));
        let result = {
            wm_class : wmClass,
            title : title
        }
        this._dbusImpl.emit_signal('FocusedWindowChanged', new GLib.Variant('(s)', [JSON.stringify(result)]));
        Main.notify("before emmit", "before emmit");
        // Main.notify(wmClass, title);
        this._currentTitle = title;
        this._currentWMClass = wmClass;

    }
}

export default StreamControllerExtension;