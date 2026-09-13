#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    pub fn CGSMainConnectionID() -> i32;
    pub fn CGSSetWindowTags(cid: i32, wid: i32, tags: *const i32, max_tag_size: usize) -> i32;
    pub fn CGSClearWindowTags(cid: i32, wid: i32, tags: *const i32, max_tag_size: usize) -> i32;
}

#[cfg(target_os = "macos")]
pub fn set_sticky(window_number: i32) {
    unsafe {
        let cid = CGSMainConnectionID();
        let tags: [i32; 2] = [0x0800, 0]; // kCGSTagSticky = 0x0800
        CGSSetWindowTags(cid, window_number, tags.as_ptr(), 32);
        
        let clear_tags: [i32; 2] = [0x0002, 0]; // kCGSTagExposeFade = 0x0002
        CGSClearWindowTags(cid, window_number, clear_tags.as_ptr(), 32);
    }
}
