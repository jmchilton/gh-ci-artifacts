// Sample Rust library with deliberate clippy warnings and bad formatting

#![allow(dead_code)]

// Clippy: should use is_empty()
// Rustfmt: bad spacing
pub fn check_empty(s: &str) -> bool {
    s.len()  ==  0  // Extra spaces
}

// Clippy: needless_return
// Rustfmt: bad indentation
pub fn add(a: i32, b: i32) -> i32 {
      return a + b; // Extra indentation
}

// Clippy: single_char_pattern
// Rustfmt: inconsistent brace placement
pub fn replace_comma(s: &str) -> String
{
    s.replace(",", ";")
}

// Clippy: redundant_pattern_matching
pub fn is_some_value(opt: Option<i32>) -> bool {
    match opt {
        Some(_) => true,
        None => false,
    }
}

// Clippy: manual_map
pub fn double_if_some(opt: Option<i32>) -> Option<i32> {
    if let Some(x) = opt {
        Some(x * 2)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_empty_pass() {
        assert!(check_empty(""));
        assert!(!check_empty("hello"));
    }

    #[test]
    fn test_add_pass() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    #[should_panic(expected = "Expected failure")]
    fn test_deliberately_fails() {
        panic!("Expected failure for fixture generation");
    }

    #[test]
    #[ignore]
    fn test_ignored() {
        assert_eq!(1 + 1, 3); // Would fail if run
    }

    #[test]
    fn test_replace_pass() {
        assert_eq!(replace_comma("a,b,c"), "a;b;c");
    }
}
