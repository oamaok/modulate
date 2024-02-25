#![feature(proc_macro_quote)]

extern crate proc_macro;
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse::Parse, parse_macro_input, ExprLit, Lit, Token};

struct WindowedSincArgs {
  half_window_size: ExprLit,
  _comma: Token![,],
  steps: ExprLit,
}

impl Parse for WindowedSincArgs {
  fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
    Ok(Self {
      half_window_size: input.parse()?,
      _comma: input.parse()?,
      steps: input.parse()?,
    })
  }
}

#[proc_macro]
pub fn generate_windowed_sinc_tables(args: TokenStream) -> TokenStream {
  let args = parse_macro_input!(args as WindowedSincArgs);

  let half_window_size: usize = if let Lit::Int(v) = &args.half_window_size.lit {
    v.base10_parse().unwrap()
  } else {
    panic!("First argument 'half_window_size' must be an unsigned integer");
  };

  let steps: usize = if let Lit::Int(v) = &args.steps.lit {
    v.base10_parse().unwrap()
  } else {
    panic!("First argument 'steps' must be an unsigned integer");
  };

  let step = 1.0 / (steps as f32);

  let mut values: Vec<f32> = vec![1.0; half_window_size * steps];
  let mut distances: Vec<f32> = vec![0.0; half_window_size * steps];

  for i in 1..(half_window_size * steps + 1) {
    let x = (i as f32) * step;

    let sinc = f32::sin(std::f32::consts::PI * x) / (std::f32::consts::PI * x);
    let blackman_window = 0.42
      + 0.5 * f32::cos(std::f32::consts::PI * x / (half_window_size as f32))
      + 0.08 * f32::cos(2.0 * std::f32::consts::PI * x / (half_window_size as f32));

    let value = sinc * blackman_window;
    if i != half_window_size * steps {
      values[i] = value;
    }
    distances[i - 1] = value - values[i - 1];
  }

  TokenStream::from(quote! {
    const HALF_WINDOW_SIZE: usize = #half_window_size;
    const STEPS: usize = #steps;
    const WINDOWED_SINC_VALUES: [f32; HALF_WINDOW_SIZE * STEPS] = [
      #(#values),*
    ];
    const WINDOWED_SINC_DISTANCES: [f32; HALF_WINDOW_SIZE * STEPS] = [
      #(#distances),*
    ];
  })
}
